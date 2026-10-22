import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRoom, makeTicket, makeUserModel } from '../test/factories';
import { Room, TicketForVoting, UserModel } from '../types';
import { CONNECTION_LOST_MESSAGE, useRoomSocket } from './useRoomSocket';

const { fakeSocket } = await vi.hoisted(async () => {
    const { createFakeSocket } = await import('../test/fakeSocket');
    return { fakeSocket: createFakeSocket() };
});
vi.mock('../services/socket', () => ({ socket: fakeSocket }));

const initialTickets = [
    makeTicket({ ticket_id: 'a', ticket_number: 'ABC-1' }),
    makeTicket({
        ticket_id: 'b',
        ticket_number: 'ABC-2',
        votes: [
            { usersub: 'u1', vote: 5 },
            { usersub: 'u2', vote: 5 },
            { usersub: 'u3', vote: 8 },
        ],
    }),
];

/** Runs the hook against real state so we can observe what events change */
const renderRoomSocket = ({ loggedIn = true } = {}) => {
    const userSub = loggedIn ? 'user-1' : undefined;
    const onError = vi.fn();
    const onReconnect = vi.fn();
    const getToken = vi.fn().mockResolvedValue('token-1');
    const hook = renderHook(
        ({ roomName, sub }) => {
            const [tickets, setTickets] =
                useState<TicketForVoting[]>(initialTickets);
            const [room, setRoom] = useState<Room | undefined>(makeRoom());
            const [archivedTickets, setArchivedTickets] = useState<
                TicketForVoting[]
            >([]);
            const [users, setUsers] = useState<UserModel[]>([]);
            const [onlineSubs, setOnlineSubs] = useState<string[]>([]);
            const [currentTicketId, setCurrentTicketId] = useState<string>();
            const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
            useRoomSocket({
                roomName,
                userSub: sub,
                getToken,
                setRoom,
                setTickets,
                setArchivedTickets,
                setUsers,
                setOnlineSubs,
                setCurrentTicketId,
                setTimerEndsAt,
                onError,
                onReconnect,
            });
            return {
                room,
                tickets,
                archivedTickets,
                users,
                onlineSubs,
                currentTicketId,
                timerEndsAt,
            };
        },
        { initialProps: { roomName: 'room-abc', sub: userSub } }
    );
    return { ...hook, onError, onReconnect, getToken };
};

describe('useRoomSocket', () => {
    beforeEach(() => fakeSocket.reset());

    describe('connection', () => {
        it('does not connect without a logged-in user', () => {
            renderRoomSocket({ loggedIn: false });
            expect(fakeSocket.connect).not.toHaveBeenCalled();
            expect(fakeSocket.emit).not.toHaveBeenCalled();
        });

        it('connects and joins the room', () => {
            renderRoomSocket();
            expect(fakeSocket.connect).toHaveBeenCalled();
            expect(fakeSocket.emit).toHaveBeenCalledWith('join', {
                roomName: 'room-abc',
            });
        });

        it('sends a fresh access token with each handshake', async () => {
            const { getToken } = renderRoomSocket();
            const auth = fakeSocket.auth as (
                cb: (data: object) => void
            ) => void;
            const data = await new Promise((resolve) => auth(resolve));
            expect(data).toEqual({ token: 'token-1' });
            expect(getToken).toHaveBeenCalled();
        });

        it('joins straight away if the socket is already connected', () => {
            fakeSocket.connected = true;
            renderRoomSocket();
            expect(fakeSocket.connect).not.toHaveBeenCalled();
            expect(fakeSocket.emit).toHaveBeenCalledWith(
                'join',
                expect.objectContaining({ roomName: 'room-abc' })
            );
        });

        it('re-joins the room after a reconnect', () => {
            renderRoomSocket();
            fakeSocket.emit.mockClear();

            act(() => fakeSocket.serverEmit('connect'));
            expect(fakeSocket.emit).toHaveBeenCalledWith('join', {
                roomName: 'room-abc',
            });
        });

        it('disconnects and removes every listener on unmount', () => {
            const { unmount } = renderRoomSocket();
            unmount();
            expect(fakeSocket.disconnect).toHaveBeenCalled();
            for (const event of [
                'connect',
                'userJoined',
                'voteReceived',
                'showVotes',
                'showEstimate',
                'error',
                'connect_error',
            ]) {
                expect(fakeSocket.listenerCount(event)).toBe(0);
            }
        });

        it('rejoins a new room when the room changes', () => {
            const { rerender } = renderRoomSocket();
            fakeSocket.emit.mockClear();
            rerender({ roomName: 'room-xyz', sub: 'user-1' });
            expect(fakeSocket.disconnect).toHaveBeenCalled();
            expect(fakeSocket.emit).toHaveBeenCalledWith('join', {
                roomName: 'room-xyz',
            });
        });
    });

    describe('server events', () => {
        it('tracks who is online on presence', () => {
            const { result } = renderRoomSocket();
            act(() => fakeSocket.serverEmit('presence', { online: ['u1'] }));
            expect(result.current.onlineSubs).toEqual(['u1']);
        });

        it("catches up with the facilitator's ticket and timer on roomState", () => {
            const { result } = renderRoomSocket();
            act(() =>
                fakeSocket.serverEmit('roomState', {
                    currentTicketId: 'b',
                    timerEndsAt: 5000,
                })
            );
            expect(result.current.currentTicketId).toBe('b');
            expect(result.current.timerEndsAt).toBe(5000);
        });

        it('follows the facilitator on ticketSelected', () => {
            const { result } = renderRoomSocket();
            act(() =>
                fakeSocket.serverEmit('ticketSelected', { ticketId: 'a' })
            );
            expect(result.current.currentTicketId).toBe('a');
        });

        it('clears the votes and hides them again on votesCleared', () => {
            const { result } = renderRoomSocket();
            act(() => fakeSocket.serverEmit('showVotes', { ticketId: 'b' }));
            act(() => fakeSocket.serverEmit('votesCleared', { ticketId: 'b' }));
            expect(result.current.tickets[1]).toEqual({
                ticket_id: 'b',
                ticket_number: 'ABC-2',
                votes: [],
                votes_revealed: false,
                archived_at: undefined,
            });
        });

        it('starts and stops the timer', () => {
            const { result } = renderRoomSocket();
            act(() => fakeSocket.serverEmit('timer', { endsAt: 9000 }));
            expect(result.current.timerEndsAt).toBe(9000);
            act(() => fakeSocket.serverEmit('timer', { endsAt: null }));
            expect(result.current.timerEndsAt).toBeNull();
        });

        it('updates who runs the room on facilitators', () => {
            const { result } = renderRoomSocket();
            act(() =>
                fakeSocket.serverEmit('facilitators', {
                    adminSub: 'new-owner',
                    coFacilitatorSubs: ['admin-1'],
                })
            );
            expect(result.current.room).toMatchObject({
                adminSub: 'new-owner',
                coFacilitatorSubs: ['admin-1'],
            });
        });

        it('moves every ticket to the archive on sprintArchived', () => {
            const { result } = renderRoomSocket();
            act(() =>
                fakeSocket.serverEmit('ticketSelected', { ticketId: 'a' })
            );
            act(() =>
                fakeSocket.serverEmit('sprintArchived', { archivedAt: 'when' })
            );
            expect(result.current.tickets).toEqual([]);
            expect(result.current.currentTicketId).toBeUndefined();
            expect(result.current.archivedTickets).toEqual(
                initialTickets.map((t) => ({ ...t, archived_at: 'when' }))
            );
        });

        it('replaces the user list on userJoined', () => {
            const { result } = renderRoomSocket();
            const users = [makeUserModel()];
            act(() => fakeSocket.serverEmit('userJoined', { users }));
            expect(result.current.users).toEqual(users);
        });

        it('records a vote on voteReceived', () => {
            const { result } = renderRoomSocket();
            act(() =>
                fakeSocket.serverEmit('voteReceived', {
                    ticketId: 'a',
                    vote: 3,
                    userSub: 'u9',
                })
            );
            expect(result.current.tickets[0].votes).toEqual([
                { usersub: 'u9', vote: 3 },
            ]);
            expect(result.current.tickets[1]).toBe(initialTickets[1]);
        });

        it('calculates stats and marks the ticket revealed on showVotes, even when not selected', () => {
            const { result } = renderRoomSocket();
            act(() => fakeSocket.serverEmit('showVotes', { ticketId: 'b' }));

            expect(result.current.currentTicketId).toBeUndefined();
            expect(result.current.tickets[1]).toMatchObject({
                votes_revealed: true,
                average_vote: 6,
                mode: 5,
                suggested_vote: { vote: 5 },
            });
            expect(result.current.tickets[0].votes_revealed).toBeUndefined();
        });

        it('updates the ticket and moves everyone to it on showEstimate', () => {
            const { result } = renderRoomSocket();
            const estimated = { ...initialTickets[0], chosen_estimate: 8 };
            act(() =>
                fakeSocket.serverEmit('showEstimate', {
                    currentTicket: estimated,
                })
            );
            expect(result.current.tickets[0]).toEqual(estimated);
            expect(result.current.currentTicketId).toBe('a');
        });

        it('passes server errors to onError', () => {
            const { onError } = renderRoomSocket();
            act(() => fakeSocket.serverEmit('error', 'Ticket not found'));
            expect(onError).toHaveBeenCalledWith('Ticket not found');
        });

        it('reports a lost connection and calls onReconnect when it returns', () => {
            const { onError, onReconnect } = renderRoomSocket();
            onReconnect.mockClear();

            act(() => fakeSocket.serverEmit('connect_error', new Error('x')));
            expect(onError).toHaveBeenCalledWith(CONNECTION_LOST_MESSAGE);

            act(() => fakeSocket.serverEmit('connect'));
            expect(onReconnect).toHaveBeenCalled();
        });
    });
});
