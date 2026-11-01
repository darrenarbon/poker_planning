import { useAuth0 } from '@auth0/auth0-react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONNECTION_LOST_MESSAGE } from '../hooks/useRoomSocket';
import { makeAuthUser, makeRoom, makeTicket } from '../test/factories';
import { PokerSessionProvider } from './PokerSessionProvider';
import { usePokerSession } from './usePokerSession';

const { fakeSocket } = await vi.hoisted(async () => {
    const { createFakeSocket } = await import('../test/fakeSocket');
    return { fakeSocket: createFakeSocket() };
});
const searchParams = vi.hoisted(() => ({ value: new URLSearchParams() }));
const api = vi.hoisted(() => ({
    getRoom: vi.fn(),
    getJiraTicket: vi.fn(),
    addTicket: vi.fn(),
    deleteTicket: vi.fn(),
    setFavourite: vi.fn(),
    setHidden: vi.fn(),
}));

vi.mock('../services/socket', () => ({ socket: fakeSocket }));
vi.mock('../hooks/useApi', () => ({ useApi: () => api }));
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('react-router-dom', () => ({
    useSearchParams: () => [searchParams.value],
}));

const ticketA = makeTicket({ ticket_id: 'a', ticket_number: 'ABC-1' });
const ticketB = makeTicket({
    ticket_id: 'b',
    ticket_number: 'ABC-2',
    votes: [
        { usersub: 'u1', vote: 3 },
        { usersub: 'u2', vote: 3 },
    ],
});

const wrapper = ({ children }: { children: ReactNode }) => (
    <PokerSessionProvider roomName="room-abc">{children}</PokerSessionProvider>
);

const renderSession = async ({ adminSub = 'admin-1' } = {}) => {
    api.getRoom.mockResolvedValue({
        room: makeRoom({ adminSub }),
        tickets: [ticketA, ticketB],
        users: [],
    });
    const hook = renderHook(() => usePokerSession(), { wrapper });
    await waitFor(() => expect(hook.result.current.room).toBeDefined());
    return hook;
};

describe('usePokerSession', () => {
    it('throws outside a PokerSessionProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => usePokerSession())).toThrow(
            'usePokerSession must be used within a PokerSessionProvider'
        );
    });
});

describe('PokerSessionProvider', () => {
    beforeEach(() => {
        fakeSocket.reset();
        vi.clearAllMocks();
        searchParams.value = new URLSearchParams();
        vi.mocked(useAuth0).mockReturnValue({
            user: makeAuthUser(),
        } as unknown as ReturnType<typeof useAuth0>);
        api.getJiraTicket.mockResolvedValue({
            summary: 'Jira summary',
            description: '',
            creator: '',
            parent: '',
            priority: '',
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => vi.restoreAllMocks());

    describe('loading', () => {
        it('loads the room and joins it over the socket', async () => {
            const { result } = await renderSession();
            expect(api.getRoom).toHaveBeenCalledWith('room-abc');
            expect(result.current.tickets).toEqual([ticketA, ticketB]);
            expect(result.current.currentTicket).toBeUndefined();
            expect(fakeSocket.emit).toHaveBeenCalledWith('join', {
                roomName: 'room-abc',
            });
        });

        it('exposes a load error', async () => {
            api.getRoom.mockRejectedValue(new Error('404'));
            const { result } = renderHook(() => usePokerSession(), {
                wrapper,
            });
            await waitFor(() =>
                expect(result.current.loadError).toMatch(/Could not load room/)
            );
        });
    });

    describe('isAdmin', () => {
        it('is false for other users', async () => {
            const { result } = await renderSession();
            expect(result.current.isAdmin).toBe(false);
        });

        it('is true for the room admin', async () => {
            const { result } = await renderSession({ adminSub: 'user-1' });
            expect(result.current.isAdmin).toBe(true);
        });

        it('ignores ?admin=true', async () => {
            searchParams.value = new URLSearchParams('admin=true');
            const { result } = await renderSession();
            expect(result.current.isAdmin).toBe(false);
        });
    });

    describe('selecting a ticket', () => {
        it('sets the current ticket and loads its Jira details', async () => {
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketB));

            expect(result.current.currentTicket).toEqual(ticketB);
            expect(result.current.showVotes).toBe(false);
            await waitFor(() =>
                expect(result.current.jira.jiraTicket?.summary).toBe(
                    'Jira summary'
                )
            );
            expect(api.getJiraTicket).toHaveBeenCalledWith('ABC-2');
        });
    });

    describe('voting', () => {
        it('emits the vote and records it locally', async () => {
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketA));
            act(() => result.current.submitVote(5));

            expect(fakeSocket.emit).toHaveBeenCalledWith('vote', {
                roomName: 'room-abc',
                ticketId: 'a',
                vote: 5,
            });
            expect(result.current.currentTicket?.votes).toEqual([
                { usersub: 'user-1', vote: 5 },
            ]);
        });

        it('does nothing without a current ticket', async () => {
            const { result } = await renderSession();
            fakeSocket.emit.mockClear();
            act(() => result.current.submitVote(5));
            act(() => result.current.revealVotes());
            act(() => result.current.setEstimate(5));
            expect(fakeSocket.emit).not.toHaveBeenCalled();
        });
    });

    describe('revealing votes', () => {
        it('asks the server to reveal the current ticket', async () => {
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketB));
            act(() => result.current.revealVotes());
            expect(fakeSocket.emit).toHaveBeenCalledWith('showVotes', {
                roomName: 'room-abc',
                ticketId: 'b',
            });
        });

        it('shows votes once the server reveals them, and remembers it per ticket', async () => {
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketB));
            act(() => fakeSocket.serverEmit('showVotes', { ticketId: 'b' }));

            expect(result.current.showVotes).toBe(true);
            expect(result.current.currentTicket?.average_vote).toBe(3);

            act(() => result.current.selectTicket(ticketA));
            expect(result.current.showVotes).toBe(false);

            act(() => result.current.selectTicket(ticketB));
            expect(result.current.showVotes).toBe(true);
        });
    });

    describe('sprint stats', () => {
        it('opens once every ticket is revealed, and can be closed and reopened', async () => {
            const { result } = await renderSession();
            expect(result.current.canShowStats).toBe(false);

            act(() => fakeSocket.serverEmit('showVotes', { ticketId: 'a' }));
            expect(result.current.statsOpen).toBe(false);
            act(() => fakeSocket.serverEmit('showVotes', { ticketId: 'b' }));
            expect(result.current.canShowStats).toBe(true);
            expect(result.current.statsOpen).toBe(true);

            act(() => result.current.closeStats());
            expect(result.current.statsOpen).toBe(false);
            act(() => result.current.openStats());
            expect(result.current.statsOpen).toBe(true);
        });
    });

    describe('favourites and hiding', () => {
        it('stars the room for the current user', async () => {
            api.setFavourite.mockResolvedValue(undefined);
            const { result } = await renderSession();
            await act(() => result.current.toggleFavourite());
            expect(api.setFavourite).toHaveBeenCalledWith('room-abc', true);
            expect(result.current.room?.favourite).toBe(true);
        });

        it('hides the room', async () => {
            api.setHidden.mockResolvedValue(undefined);
            const { result } = await renderSession({ adminSub: 'user-1' });
            await act(() => result.current.setRoomHidden(true));
            expect(api.setHidden).toHaveBeenCalledWith('room-abc', true);
            expect(result.current.room?.hidden).toBe(true);
        });

        it('shows an error if hiding fails', async () => {
            api.setHidden.mockRejectedValue(new Error('403'));
            const { result } = await renderSession();
            await act(() => result.current.setRoomHidden(true));
            expect(result.current.room?.hidden).toBeFalsy();
            expect(result.current.error).toBe('Could not hide the room.');
        });
    });

    describe('refinement mode', () => {
        afterEach(() => sessionStorage.clear());

        it("hides the admin's own vote until votes are revealed, for every ticket", async () => {
            const { result } = await renderSession({ adminSub: 'user-1' });
            expect(result.current.refinementMode).toBe(false);

            act(() => result.current.toggleRefinementMode());
            act(() => result.current.selectTicket(ticketA));
            expect(result.current.refinementMode).toBe(true);
            expect(result.current.hideOwnVote).toBe(true);

            act(() => result.current.selectTicket(ticketB));
            expect(result.current.hideOwnVote).toBe(true);
            act(() => fakeSocket.serverEmit('showVotes', { ticketId: 'b' }));
            expect(result.current.hideOwnVote).toBe(false);
        });

        it('is remembered for the room across a refresh', async () => {
            const first = await renderSession({ adminSub: 'user-1' });
            act(() => first.result.current.toggleRefinementMode());
            first.unmount();

            const { result } = await renderSession({ adminSub: 'user-1' });
            expect(result.current.refinementMode).toBe(true);
        });

        it('only moves everyone to a selected ticket while it is on', async () => {
            const { result } = await renderSession({ adminSub: 'user-1' });
            act(() => result.current.selectTicket(ticketA));
            expect(fakeSocket.emit).not.toHaveBeenCalledWith(
                'selectTicket',
                expect.anything()
            );

            act(() => result.current.toggleRefinementMode());
            // switching on brings everyone to the facilitator's ticket
            expect(fakeSocket.emit).toHaveBeenCalledWith('selectTicket', {
                roomName: 'room-abc',
                ticketId: 'a',
            });

            act(() => result.current.selectTicket(ticketB));
            expect(fakeSocket.emit).toHaveBeenCalledWith('selectTicket', {
                roomName: 'room-abc',
                ticketId: 'b',
            });
        });

        it('never applies to non-admins', async () => {
            const { result } = await renderSession();
            act(() => result.current.toggleRefinementMode());
            expect(result.current.refinementMode).toBe(false);
            expect(result.current.hideOwnVote).toBe(false);
        });
    });

    describe('setting an estimate', () => {
        it('updates the ticket and broadcasts it', async () => {
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketA));
            act(() => result.current.setEstimate(8));

            expect(result.current.currentTicket?.chosen_estimate).toBe(8);
            expect(fakeSocket.emit).toHaveBeenCalledWith('setEstimate', {
                roomName: 'room-abc',
                currentTicket: expect.objectContaining({
                    ticket_id: 'a',
                    chosen_estimate: 8,
                }),
            });
        });
    });

    describe('adding a ticket', () => {
        it('adds the new ticket to the top of the list', async () => {
            const newTicket = makeTicket({ ticket_id: 'c' });
            api.addTicket.mockResolvedValue(newTicket);
            const { result } = await renderSession();

            await act(() => result.current.addTicket('ABC-3'));

            expect(api.addTicket).toHaveBeenCalledWith('room-abc', 'ABC-3');
            expect(result.current.tickets[2]).toEqual(newTicket);
        });

        it('ignores an empty ticket number', async () => {
            const { result } = await renderSession();
            await act(() => result.current.addTicket(''));
            expect(api.addTicket).not.toHaveBeenCalled();
        });

        it('shows a dismissible error when adding fails', async () => {
            api.addTicket.mockRejectedValue(new Error('boom'));
            const { result } = await renderSession();

            await act(() => result.current.addTicket('ABC-3'));
            expect(result.current.error).toBe('Could not add ticket ABC-3.');

            act(() => result.current.dismissError());
            expect(result.current.error).toBeNull();
        });
    });

    describe('reordering tickets', () => {
        it('moves the ticket and sends the new order to the room', async () => {
            const { result } = await renderSession();
            act(() => result.current.moveTicket('b', 0));
            expect(result.current.tickets).toEqual([ticketB, ticketA]);
            expect(fakeSocket.emit).toHaveBeenCalledWith('reorderTickets', {
                roomName: 'room-abc',
                ticketIds: ['b', 'a'],
            });
        });

        it('sends nothing when the ticket stays put', async () => {
            const { result } = await renderSession();
            fakeSocket.emit.mockClear();
            act(() => result.current.moveTicket('a', 1));
            expect(fakeSocket.emit).not.toHaveBeenCalled();
        });
    });

    describe('deleting a ticket', () => {
        it('removes the ticket and clears the selection', async () => {
            api.deleteTicket.mockResolvedValue(undefined);
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketA));

            await act(() => result.current.deleteCurrentTicket());
            expect(api.deleteTicket).toHaveBeenCalledWith('a');
            expect(result.current.tickets).toEqual([ticketB]);
            expect(result.current.currentTicket).toBeUndefined();
        });

        it('keeps the ticket and shows an error when deleting fails', async () => {
            api.deleteTicket.mockRejectedValue(new Error('boom'));
            const { result } = await renderSession();
            act(() => result.current.selectTicket(ticketA));

            await act(() => result.current.deleteCurrentTicket());
            expect(result.current.tickets).toHaveLength(2);
            expect(result.current.error).toBe('Could not delete ticket ABC-1.');
        });
    });

    describe('socket errors', () => {
        it('shows server errors', async () => {
            const { result } = await renderSession();
            act(() => fakeSocket.serverEmit('error', 'Ticket not found'));
            expect(result.current.error).toBe('Ticket not found');
        });

        it('clears the connection-lost error on reconnect', async () => {
            const { result } = await renderSession();
            act(() => fakeSocket.serverEmit('connect_error', new Error('x')));
            expect(result.current.error).toBe(CONNECTION_LOST_MESSAGE);

            act(() => fakeSocket.serverEmit('connect'));
            expect(result.current.error).toBeNull();
        });

        it('keeps other errors on reconnect', async () => {
            const { result } = await renderSession();
            act(() => fakeSocket.serverEmit('error', 'Ticket not found'));
            act(() => fakeSocket.serverEmit('connect'));
            expect(result.current.error).toBe('Ticket not found');
        });
    });
});
