import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import config from '../config';
import { makeAuthUser, makeRoom, makeRoomSummary } from '../test/factories';
import { ApiError, createApi } from './api';

const fetchMock = vi.fn();
const getToken = vi.fn();

const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

/** The [url, init] of the single fetch call made */
const lastRequest = () => {
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return {
        url,
        method: init.method,
        headers: init.headers as Record<string, string>,
        body:
            init.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
};

describe('createApi', () => {
    const api = createApi(getToken);

    beforeEach(() => {
        getToken.mockResolvedValue('token-123');
        fetchMock.mockImplementation(async () => jsonResponse({}));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    describe('every request', () => {
        it('targets the configured API with JSON and bearer auth headers', async () => {
            await api.getRoom('room-abc');
            const { url, headers } = lastRequest();
            expect(url).toBe(`${config.apiUrl}/room/room-abc`);
            expect(headers).toEqual({
                'Content-Type': 'application/json',
                Authorization: 'Bearer token-123',
            });
        });

        it('fetches a fresh token for each request', async () => {
            getToken
                .mockResolvedValueOnce('first')
                .mockResolvedValueOnce('second');
            await api.getRoom('room-abc');
            await api.getRoom('room-abc');
            expect(
                fetchMock.mock.calls.map(
                    ([, init]) => init.headers.Authorization
                )
            ).toEqual(['Bearer first', 'Bearer second']);
        });

        it('throws an ApiError with the status when the response is not OK', async () => {
            fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));
            const error = await api.deleteTicket('t1').catch((e: unknown) => e);
            expect(error).toBeInstanceOf(ApiError);
            expect(error).toMatchObject({
                status: 404,
                message: 'DELETE /ticket/t1 failed',
            });
        });

        it('does not call fetch if getting the token fails', async () => {
            getToken.mockRejectedValue(new Error('login required'));
            await expect(api.getRoom('room-abc')).rejects.toThrow(
                'login required'
            );
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('passes network errors through', async () => {
            fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
            await expect(api.getRoom('room-abc')).rejects.toThrow(
                'Failed to fetch'
            );
        });
    });

    describe('endpoints', () => {
        it('login posts the user', async () => {
            const user = makeAuthUser();
            await api.login(user);
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/login`,
                method: 'POST',
                body: { user },
            });
        });

        it("getUserRooms returns the user's rooms", async () => {
            const rooms = [makeRoomSummary()];
            fetchMock.mockResolvedValue(jsonResponse({ rooms }));
            await expect(api.getUserRooms()).resolves.toEqual(rooms);
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/me/rooms`,
                method: 'GET',
                body: undefined,
            });
        });

        it('createRoom posts the name and base URL and returns the room id', async () => {
            fetchMock.mockResolvedValue(jsonResponse({ roomId: 'new-room' }));
            await expect(
                api.createRoom('Planning', 'https://jira.example.com')
            ).resolves.toBe('new-room');
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/newroom`,
                method: 'POST',
                body: {
                    roomName: 'Planning',
                    baseUrl: 'https://jira.example.com',
                },
            });
        });

        it('getRoom returns the room details', async () => {
            const details = { room: makeRoom(), tickets: [], users: [] };
            fetchMock.mockResolvedValue(jsonResponse(details));
            await expect(api.getRoom('room-abc')).resolves.toEqual(details);
            expect(lastRequest().method).toBe('GET');
        });

        it('saveTickets posts the ticket list', async () => {
            await api.saveTickets('room-abc', ['ABC-1', 'ABC-2']);
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/room/room-abc/tickets`,
                method: 'POST',
                body: { ticketsToSave: ['ABC-1', 'ABC-2'] },
            });
        });

        it.each([
            ['setFavourite', 'favourite'],
            ['setHidden', 'hidden'],
        ] as const)('%s puts the flag', async (method, flag) => {
            await api[method]('room-abc', true);
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/room/room-abc/${flag}`,
                method: 'PUT',
                body: { [flag]: true },
            });
        });

        it('updateBaseUrl puts the new url', async () => {
            await api.updateBaseUrl('room-abc', 'https://x.com/browse');
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/room/room-abc/baseUrl`,
                method: 'PUT',
                body: { baseUrl: 'https://x.com/browse' },
            });
        });

        it('addTicket posts the number and returns the ticket with no votes', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse({ ticket_id: 't9', ticket_number: 'ABC-9' })
            );
            await expect(api.addTicket('room-abc', 'ABC-9')).resolves.toEqual({
                ticket_id: 't9',
                ticket_number: 'ABC-9',
                votes: [],
            });
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/room/room-abc/newTicket`,
                method: 'POST',
                body: { ticketNumber: 'ABC-9' },
            });
        });

        it('deleteTicket sends a DELETE for the ticket', async () => {
            await api.deleteTicket('t1');
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/ticket/t1`,
                method: 'DELETE',
                body: undefined,
            });
        });

        it('getJiraTicket maps the Jira response', async () => {
            fetchMock.mockResolvedValue(
                jsonResponse({
                    fields: {
                        summary: 'Add login',
                        creator: { displayName: 'Ada Lovelace' },
                        priority: { name: 'High' },
                    },
                    renderedFields: { description: '<p>Details</p>' },
                })
            );
            await expect(api.getJiraTicket('ABC-1')).resolves.toEqual({
                summary: 'Add login',
                description: '<p>Details</p>',
                creator: 'Ada Lovelace',
                parent: '',
                priority: 'High',
            });
            expect(lastRequest()).toMatchObject({
                url: `${config.apiUrl}/jiraticket/ABC-1`,
                method: 'GET',
            });
        });
    });
});
