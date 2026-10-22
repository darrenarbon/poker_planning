import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeRoom, makeTicket, makeUserModel } from '../test/factories';
import { useRoomDetails } from './useRoomDetails';

const api = { getRoom: vi.fn() };
vi.mock('./useApi', () => ({ useApi: () => api }));

const details = {
    room: makeRoom(),
    tickets: [makeTicket()],
    users: [makeUserModel()],
};

describe('useRoomDetails', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('loads the room, tickets and users', async () => {
        api.getRoom.mockResolvedValue(details);
        const { result } = renderHook(() => useRoomDetails('room-abc'));

        expect(result.current.room).toBeUndefined();
        await waitFor(() => expect(result.current.room).toEqual(details.room));
        expect(api.getRoom).toHaveBeenCalledWith('room-abc');
        expect(result.current.tickets).toEqual(details.tickets);
        expect(result.current.users).toEqual(details.users);
        expect(result.current.loadError).toBeNull();
    });

    it('reports a load error', async () => {
        api.getRoom.mockRejectedValue(new Error('404'));
        const { result } = renderHook(() => useRoomDetails('room-abc'));

        await waitFor(() =>
            expect(result.current.loadError).toBe(
                'Could not load room "room-abc".'
            )
        );
        expect(result.current.room).toBeUndefined();
    });

    it('exposes setters for live updates', async () => {
        api.getRoom.mockResolvedValue(details);
        const { result } = renderHook(() => useRoomDetails('room-abc'));
        await waitFor(() => expect(result.current.room).toBeDefined());

        const extra = makeTicket({ ticket_id: 't2' });
        act(() => result.current.setTickets((prev) => [...prev, extra]));
        expect(result.current.tickets).toHaveLength(2);

        act(() => result.current.setUsers([]));
        expect(result.current.users).toEqual([]);
    });
});
