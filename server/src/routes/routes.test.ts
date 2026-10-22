import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import * as jiraService from '../services/jiraService.js';
import * as roomService from '../services/roomService.js';
import * as ticketService from '../services/ticketService.js';
import * as userService from '../services/userService.js';
import { makeRoom, makeTicket } from '../test/factories.js';
import { TEST_SUB } from '../test/mockCheckJwt.js';
import { AppError, notFound } from '../utils/errors.js';

vi.mock('../middleware/checkJwt.js', async () => ({
    checkJwt: (await import('../test/mockCheckJwt.js')).fakeCheckJwt,
}));
vi.mock('../services/jiraService.js');
vi.mock('../services/roomService.js');
vi.mock('../services/ticketService.js');
vi.mock('../services/userService.js');

const app = createApp();
const AUTH = { Authorization: 'Bearer token' };

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('CORS', () => {
    it('answers preflight requests', async () => {
        const res = await request(app).options('/room/abc');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe('*');
    });
});

describe('POST /login', () => {
    const user = {
        sub: 'auth0|new',
        email: 'a@b.com',
        given_name: 'A',
        family_name: 'B',
        nickname: 'ab',
        picture: 'pic',
    };

    it('ensures the user exists', async () => {
        const res = await request(app).post('/login').send({ user });
        expect(res.status).toBe(200);
        expect(userService.ensureUser).toHaveBeenCalledWith({
            auth0_sub: 'auth0|new',
            email: 'a@b.com',
            given_name: 'A',
            family_name: 'B',
            nickname: 'ab',
            picture: 'pic',
        });
    });

    it('rejects a missing user with 400', async () => {
        const res = await request(app).post('/login').send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'User details are required' });
    });

    it('returns 500 when creating the user fails', async () => {
        vi.mocked(userService.ensureUser).mockRejectedValue(
            new AppError(500, 'Error creating user')
        );
        const res = await request(app).post('/login').send({ user });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Error creating user' });
    });
});

describe('authenticated routes', () => {
    it.each([
        ['post', '/newroom'],
        ['get', '/room/abc'],
        ['post', '/room/abc/tickets'],
        ['post', '/room/abc/newTicket'],
        ['put', '/room/abc/baseUrl'],
        ['put', '/room/abc/favourite'],
        ['put', '/room/abc/hidden'],
        ['get', '/users/x/rooms'],
        ['delete', '/ticket/1'],
        ['get', '/jiraticket/PP-1'],
        ['post', '/jiraticket/PP-1'],
        ['get', '/jiraticket/alltickets'],
    ] as const)('%s %s requires a token', async (method, path) => {
        const res = await request(app)[method](path);
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: 'Unauthorized' });
    });
});

describe('room routes', () => {
    it('POST /newroom creates a room for the caller', async () => {
        vi.mocked(roomService.createRoom).mockResolvedValue('room123456');
        const res = await request(app)
            .post('/newroom')
            .set(AUTH)
            .send({ roomName: 'Sprint', baseUrl: 'url' });
        expect(res.body).toEqual({ roomId: 'room123456' });
        expect(roomService.createRoom).toHaveBeenCalledWith(
            TEST_SUB,
            'Sprint',
            'url'
        );
    });

    it('GET /room/:roomName returns the room details', async () => {
        const details = { tickets: [], users: [], room: { roomId: 1 } };
        vi.mocked(roomService.getRoomDetails).mockResolvedValue(
            details as never
        );
        const res = await request(app).get('/room/abc').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(details);
        expect(roomService.getRoomDetails).toHaveBeenCalledWith(
            'abc',
            TEST_SUB
        );
    });

    it('GET /room/:roomName returns 404 for an unknown room', async () => {
        vi.mocked(roomService.getRoomDetails).mockRejectedValue(
            notFound('Room not found')
        );
        const res = await request(app).get('/room/nope').set(AUTH);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Room not found' });
    });

    it('PUT /room/:roomName/baseUrl updates it for the caller', async () => {
        const res = await request(app)
            .put('/room/abc/baseUrl')
            .set(AUTH)
            .send({ baseUrl: ' https://jira.example.com/browse ' });
        expect(res.status).toBe(200);
        expect(roomService.updateBaseUrl).toHaveBeenCalledWith(
            'abc',
            TEST_SUB,
            'https://jira.example.com/browse'
        );
    });

    it('PUT /room/:roomName/baseUrl rejects an empty url', async () => {
        const res = await request(app)
            .put('/room/abc/baseUrl')
            .set(AUTH)
            .send({ baseUrl: '  ' });
        expect(res.status).toBe(400);
    });

    it.each([
        ['favourite', roomService.setFavourite],
        ['hidden', roomService.setHidden],
    ] as const)('PUT /room/:roomName/%s saves the flag', async (flag, fn) => {
        const res = await request(app)
            .put(`/room/abc/${flag}`)
            .set(AUTH)
            .send({ [flag]: true });
        expect(res.body).toEqual({ [flag]: true });
        expect(fn).toHaveBeenCalledWith('abc', TEST_SUB, true);
    });

    it.each(['favourite', 'hidden'])(
        'PUT /room/:roomName/%s rejects a non-boolean',
        async (flag) => {
            const res = await request(app)
                .put(`/room/abc/${flag}`)
                .set(AUTH)
                .send({ [flag]: 'yes' });
            expect(res.status).toBe(400);
        }
    );

    it('POST /room/:roomName/tickets adds the tickets', async () => {
        const res = await request(app)
            .post('/room/abc/tickets')
            .set(AUTH)
            .send({ ticketsToSave: ['PP-1', 'PP-2'] });
        expect(res.body).toEqual({ message: 'Tickets added' });
        expect(ticketService.addTicketsToRoom).toHaveBeenCalledWith('abc', [
            'PP-1',
            'PP-2',
        ]);
    });

    it('POST /room/:roomName/tickets rejects a non-array', async () => {
        const res = await request(app)
            .post('/room/abc/tickets')
            .set(AUTH)
            .send({ ticketsToSave: 'PP-1' });
        expect(res.status).toBe(400);
        expect(ticketService.addTicketsToRoom).not.toHaveBeenCalled();
    });

    it('POST /room/:roomName/newTicket returns the new ticket', async () => {
        const ticket = makeTicket();
        vi.mocked(ticketService.addTicketsToRoom).mockResolvedValue([ticket]);
        const res = await request(app)
            .post('/room/abc/newTicket')
            .set(AUTH)
            .send({ ticketNumber: 'PP-1' });
        expect(res.body).toEqual(ticket);
        expect(ticketService.addTicketsToRoom).toHaveBeenCalledWith('abc', [
            'PP-1',
        ]);
    });

    it('GET /users/:userSub/rooms returns their rooms', async () => {
        const room = {
            ...makeRoom(),
            is_admin: true,
            favourite: false,
            last_joined_at: null,
        };
        vi.mocked(roomService.getRoomsForUser).mockResolvedValue([room]);
        const res = await request(app).get('/users/auth0%7Cx/rooms').set(AUTH);
        expect(res.body).toEqual({ rooms: [room] });
        expect(roomService.getRoomsForUser).toHaveBeenCalledWith('auth0|x');
    });
});

describe('DELETE /ticket/:ticketId', () => {
    it('deletes the ticket', async () => {
        const res = await request(app).delete('/ticket/100').set(AUTH);
        expect(res.body).toEqual({ message: 'Ticket deleted' });
        expect(ticketService.deleteTicket).toHaveBeenCalledWith('100');
    });

    it('returns 404 for an unknown ticket', async () => {
        vi.mocked(ticketService.deleteTicket).mockRejectedValue(
            notFound('Ticket not found')
        );
        const res = await request(app).delete('/ticket/100').set(AUTH);
        expect(res.status).toBe(404);
    });
});

describe('jira routes', () => {
    it('GET /jiraticket/alltickets is not treated as a ticket id', async () => {
        vi.mocked(jiraService.getIssuesNeedingEstimates).mockResolvedValue({
            issues: [],
        });
        const res = await request(app).get('/jiraticket/alltickets').set(AUTH);
        expect(res.body).toEqual({ issues: [] });
        expect(jiraService.getIssue).not.toHaveBeenCalled();
    });

    it('GET /jiraticket/:ticketId returns the issue', async () => {
        vi.mocked(jiraService.getIssue).mockResolvedValue({ key: 'PP-1' });
        const res = await request(app).get('/jiraticket/PP-1').set(AUTH);
        expect(res.body).toEqual({ key: 'PP-1' });
        expect(jiraService.getIssue).toHaveBeenCalledWith('PP-1');
    });

    it("GET /jiraticket/:ticketId passes on Jira's error status", async () => {
        vi.mocked(jiraService.getIssue).mockRejectedValue(
            new AppError(404, 'Error communicating with JIRA')
        );
        const res = await request(app).get('/jiraticket/PP-9').set(AUTH);
        expect(res.status).toBe(404);
    });

    it('POST /jiraticket/:ticketId sets story points', async () => {
        vi.mocked(jiraService.setStoryPoints).mockResolvedValue(null);
        const res = await request(app)
            .post('/jiraticket/PP-1')
            .set(AUTH)
            .send({ storyPoints: 5 });
        expect(res.status).toBe(200);
        expect(jiraService.setStoryPoints).toHaveBeenCalledWith('PP-1', 5);
    });
});

describe('unknown routes', () => {
    it('return the not found message without requiring auth', async () => {
        const res = await request(app).get('/does/not/exist');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/page not found/);
    });

    it('return 500 JSON for unexpected errors', async () => {
        vi.mocked(roomService.getRoomDetails).mockRejectedValue(
            new Error('kaboom')
        );
        const res = await request(app).get('/room/abc').set(AUTH);
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Internal server error' });
    });
});
