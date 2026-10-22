import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTicket, makeUserModel } from '../test/factories';
import { TicketForVoting, UserModel } from '../types';
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
    const hook = renderHook(
        ({ roomName, sub }) => {
            const [tickets, setTickets] =
                useState<TicketForVoting[]>(initialTickets);
            const [users, setUsers] = useState<UserModel[]>([]);
            const [currentTicketId, setCurrentTicketId] = useState<string>();
            useRoomSocket({
                roomName,
                userSub: sub,
                setTickets,
                setUsers,
                setCurrentTicketId,
                onError,
                onReconnect,
            });
            return { tickets, users, currentTicketId };
        },
        { initialProps: { roomName: 'room-abc', sub: userSub } }
    );
    return { ...hook, onError, onReconnect };
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
                userSub: 'user-1',
            });
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
                userSub: 'user-1',
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
                userSub: 'user-1',
            });
        });
    });

    describe('server events', () => {
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
