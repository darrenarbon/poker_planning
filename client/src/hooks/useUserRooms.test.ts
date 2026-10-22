import { useAuth0 } from '@auth0/auth0-react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser, makeRoomSummary } from '../test/factories';
import { useUserRooms } from './useUserRooms';

const api = { login: vi.fn(), getUserRooms: vi.fn() };
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('./useApi', () => ({ useApi: () => api }));

const user = makeAuthUser();

const mockAuth = (isAuthenticated: boolean) =>
    vi.mocked(useAuth0).mockReturnValue({
        isAuthenticated,
        user: isAuthenticated ? user : undefined,
    } as unknown as ReturnType<typeof useAuth0>);

describe('useUserRooms', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('does nothing while logged out', () => {
        mockAuth(false);
        const { result } = renderHook(() => useUserRooms());
        expect(api.login).not.toHaveBeenCalled();
        expect(result.current).toEqual({
            rooms: [],
            loaded: false,
            error: null,
        });
    });

    it('logs the user in, then loads their rooms', async () => {
        mockAuth(true);
        const rooms = [makeRoomSummary()];
        api.login.mockResolvedValue(undefined);
        api.getUserRooms.mockResolvedValue(rooms);

        const { result } = renderHook(() => useUserRooms());

        await waitFor(() => expect(result.current.loaded).toBe(true));
        expect(api.login).toHaveBeenCalledWith(user);
        expect(api.getUserRooms).toHaveBeenCalledWith('user-1');
        expect(result.current.rooms).toEqual(rooms);
        expect(result.current.error).toBeNull();
    });

    it('reports an error and stops loading when it fails', async () => {
        mockAuth(true);
        api.login.mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useUserRooms());

        await waitFor(() => expect(result.current.loaded).toBe(true));
        expect(result.current.error).toMatch(/Could not load your rooms/);
        expect(result.current.rooms).toEqual([]);
    });
});
