import { useAuth0 } from '@auth0/auth0-react';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));

const getAccessTokenSilently = vi.fn();
const fetchMock = vi.fn();

describe('useApi', () => {
    beforeEach(() => {
        vi.mocked(useAuth0).mockReturnValue({
            getAccessTokenSilently,
        } as unknown as ReturnType<typeof useAuth0>);
        getAccessTokenSilently.mockResolvedValue('token-123');
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ rooms: [] }), { status: 200 })
        );
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('authenticates requests with the current Auth0 token', async () => {
        const { result } = renderHook(() => useApi());
        await result.current.getUserRooms('user-1');

        expect(getAccessTokenSilently).toHaveBeenCalled();
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/users\/user-1\/rooms$/);
        expect(init.headers.Authorization).toBe('Bearer token-123');
    });

    it('returns the same client between renders', () => {
        const { result, rerender } = renderHook(() => useApi());
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });

    it('rejects when the response is not OK', async () => {
        fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
        const { result } = renderHook(() => useApi());
        await expect(result.current.getRoom('room-abc')).rejects.toMatchObject({
            status: 500,
        });
    });
});
