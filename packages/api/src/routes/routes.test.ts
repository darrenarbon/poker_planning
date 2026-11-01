import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import * as jiraService from '../services/jiraService.js';
import * as roomService from '../apps/planningPoker/services/roomService.js';
import * as ticketService from '../apps/planningPoker/services/ticketService.js';
import * as teamService from '../services/teamService.js';
import * as userService from '../services/userService.js';
import {
    makeRoom,
    makeTeam,
    makeTeamInvite,
    makeTicket,
} from '../test/factories.js';
import { TEST_SUB } from '../test/mockCheckJwt.js';
import { AppError, notFound } from '../utils/errors.js';

vi.mock('../middleware/checkJwt.js', async () => ({
    checkJwt: (await import('../test/mockCheckJwt.js')).fakeCheckJwt,
}));
vi.mock('../services/jiraService.js');
vi.mock('../apps/planningPoker/services/roomService.js');
vi.mock('../apps/planningPoker/services/ticketService.js');
vi.mock('../services/teamService.js');
vi.mock('../services/userService.js');

const app = createApp();
const AUTH = { Authorization: 'Bearer token' };
// a planning session in the future, sent with a time zone offset
const WHEN = '2030-05-01T10:30:00+01:00';
const WHEN_ISO = '2030-05-01T09:30:00.000Z';

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
        sub: 'auth0|someone-else',
        email: 'a@b.com',
        given_name: 'A',
        family_name: 'B',
        name: 'A B',
        nickname: 'ab',
        picture: 'pic',
    };

    it('requires a token', async () => {
        const res = await request(app).post('/login').send({ user });
        expect(res.status).toBe(401);
        expect(userService.ensureUser).not.toHaveBeenCalled();
    });

    it("ensures the user exists, using the token's sub rather than the body's", async () => {
        const res = await request(app).post('/login').set(AUTH).send({ user });
        expect(res.status).toBe(200);
        expect(userService.ensureUser).toHaveBeenCalledWith(
            {
                auth0_sub: TEST_SUB,
                email: 'a@b.com',
                given_name: 'A',
                family_name: 'B',
                nickname: 'ab',
                picture: 'pic',
            },
            'A B'
        );
    });

    it('rejects a missing user with 400', async () => {
        const res = await request(app).post('/login').set(AUTH).send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'User details are required' });
    });

    it('returns 500 when creating the user fails', async () => {
        vi.mocked(userService.ensureUser).mockRejectedValue(
            new AppError(500, 'Error creating user')
        );
        const res = await request(app).post('/login').set(AUTH).send({ user });
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
        ['put', '/room/abc/scheduledAt'],
        ['get', '/me/rooms'],
        ['get', '/me/settings'],
        ['put', '/me/settings'],
        ['get', '/me/profile'],
        ['put', '/me/profile'],
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
            .send({ roomName: 'Sprint', baseUrl: 'url', scheduledAt: WHEN });
        expect(res.body).toEqual({ roomId: 'room123456' });
        expect(roomService.createRoom).toHaveBeenCalledWith(
            TEST_SUB,
            'Sprint',
            'url',
            {
                scheduledAt: WHEN_ISO,
                teamId: undefined,
                memberSubs: undefined,
                coFacilitatorSubs: undefined,
            }
        );
    });

    it('POST /newroom passes the team and chosen people through', async () => {
        vi.mocked(roomService.createRoom).mockResolvedValue('room123456');
        const res = await request(app)
            .post('/newroom')
            .set(AUTH)
            .send({
                roomName: 'Sprint',
                baseUrl: 'url',
                scheduledAt: WHEN,
                teamId: 5,
                memberSubs: ['a', 'b'],
                coFacilitatorSubs: ['b'],
            });
        expect(res.status).toBe(200);
        expect(roomService.createRoom).toHaveBeenCalledWith(
            TEST_SUB,
            'Sprint',
            'url',
            {
                scheduledAt: WHEN_ISO,
                teamId: 5,
                memberSubs: ['a', 'b'],
                coFacilitatorSubs: ['b'],
            }
        );
    });

    it.each([
        ['missing', undefined],
        ['blank', '  '],
        ['not a date', 'next tuesday'],
        ['not a string', 12345],
        ['ancient', '1970-01-01T00:00:00Z'],
        ['absurdly far ahead', '2999-01-01T00:00:00Z'],
    ])(
        'POST /newroom rejects a date that is %s with 400',
        async (_name, value) => {
            const res = await request(app)
                .post('/newroom')
                .set(AUTH)
                .send({ roomName: 'S', baseUrl: 'u', scheduledAt: value });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/scheduledAt/);
            expect(roomService.createRoom).not.toHaveBeenCalled();
        }
    );

    it('PUT /room/:roomName/scheduledAt moves the session', async () => {
        const res = await request(app)
            .put('/room/abc/scheduledAt')
            .set(AUTH)
            .send({ scheduledAt: WHEN });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ scheduledAt: WHEN_ISO });
        expect(roomService.updateScheduledAt).toHaveBeenCalledWith(
            'abc',
            TEST_SUB,
            WHEN_ISO
        );
    });

    it('PUT /room/:roomName/scheduledAt rejects a bad date with 400', async () => {
        const res = await request(app)
            .put('/room/abc/scheduledAt')
            .set(AUTH)
            .send({ scheduledAt: 'soon' });
        expect(res.status).toBe(400);
        expect(roomService.updateScheduledAt).not.toHaveBeenCalled();
    });

    it('PUT /room/:roomName/scheduledAt passes a 403 through', async () => {
        vi.mocked(roomService.updateScheduledAt).mockRejectedValue(
            new AppError(403, 'Only a facilitator can do that')
        );
        const res = await request(app)
            .put('/room/abc/scheduledAt')
            .set(AUTH)
            .send({ scheduledAt: WHEN });
        expect(res.status).toBe(403);
    });

    it('POST /newroom rejects a bad team id or member list with 400', async () => {
        const bad = await request(app).post('/newroom').set(AUTH).send({
            roomName: 'S',
            baseUrl: 'u',
            scheduledAt: WHEN,
            teamId: 'x',
        });
        expect(bad.status).toBe(400);
        const badList = await request(app).post('/newroom').set(AUTH).send({
            roomName: 'S',
            baseUrl: 'u',
            scheduledAt: WHEN,
            teamId: 1,
            memberSubs: 'a',
        });
        expect(badList.status).toBe(400);
        expect(roomService.createRoom).not.toHaveBeenCalled();
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
        expect(ticketService.addTicketsToRoom).toHaveBeenCalledWith(
            'abc',
            TEST_SUB,
            ['PP-1', 'PP-2']
        );
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
        expect(ticketService.addTicketsToRoom).toHaveBeenCalledWith(
            'abc',
            TEST_SUB,
            ['PP-1']
        );
    });

    it("GET /me/rooms returns the caller's rooms", async () => {
        const room = {
            ...makeRoom(),
            is_admin: true,
            favourite: false,
            last_joined_at: null,
        };
        vi.mocked(roomService.getRoomsForUser).mockResolvedValue([room]);
        const res = await request(app).get('/me/rooms').set(AUTH);
        expect(res.body).toEqual({ rooms: [room] });
        expect(roomService.getRoomsForUser).toHaveBeenCalledWith(TEST_SUB);
    });
});

describe('settings routes', () => {
    it("GET /me/settings returns the caller's settings", async () => {
        vi.mocked(userService.getSettings).mockResolvedValue({ theme: 'dark' });
        const res = await request(app).get('/me/settings').set(AUTH);
        expect(res.body).toEqual({ theme: 'dark' });
        expect(userService.getSettings).toHaveBeenCalledWith(TEST_SUB);
    });

    it('PUT /me/settings saves only the known fields, trimmed', async () => {
        const res = await request(app)
            .put('/me/settings')
            .set(AUTH)
            .send({
                defaultBaseUrl: ' https://jira.example.com/browse ',
                theme: 'light',
                exemplars: [{ estimate: 3, ticketNumber: ' PP-7 ' }],
                extra: 'ignored',
            });
        const saved = {
            defaultBaseUrl: 'https://jira.example.com/browse',
            theme: 'light',
            exemplars: [{ estimate: 3, ticketNumber: 'PP-7' }],
        };
        expect(res.status).toBe(200);
        expect(res.body).toEqual(saved);
        expect(userService.saveSettings).toHaveBeenCalledWith(TEST_SUB, saved);
    });

    it.each([
        [{ theme: 'purple' }],
        [{ defaultBaseUrl: 5 }],
        [{ exemplars: 'PP-1' }],
        [{ exemplars: [{ estimate: 3 }] }],
        [{ exemplars: [{ estimate: 2.5, ticketNumber: 'PP-1' }] }],
    ])('PUT /me/settings rejects %j', async (body) => {
        const res = await request(app).put('/me/settings').set(AUTH).send(body);
        expect(res.status).toBe(400);
        expect(userService.saveSettings).not.toHaveBeenCalled();
    });
});

describe('profile routes', () => {
    it("GET /me/profile returns the caller's name", async () => {
        const profile = { givenName: 'Ada', familyName: 'Lovelace' };
        vi.mocked(userService.getProfile).mockResolvedValue(profile);
        const res = await request(app).get('/me/profile').set(AUTH);
        expect(res.body).toEqual(profile);
        expect(userService.getProfile).toHaveBeenCalledWith(TEST_SUB);
    });

    it('PUT /me/profile saves the trimmed name', async () => {
        const res = await request(app)
            .put('/me/profile')
            .set(AUTH)
            .send({ givenName: ' Ada ', familyName: ' Lovelace ', extra: 1 });
        const saved = { givenName: 'Ada', familyName: 'Lovelace' };
        expect(res.status).toBe(200);
        expect(res.body).toEqual(saved);
        expect(userService.saveProfile).toHaveBeenCalledWith(TEST_SUB, saved);
    });

    it.each([
        [{ givenName: 'Ada' }],
        [{ givenName: '  ', familyName: 'Lovelace' }],
        [{ givenName: 'Ada', familyName: 5 }],
        [{ givenName: 'A'.repeat(101), familyName: 'Lovelace' }],
    ])('PUT /me/profile rejects %j', async (body) => {
        const res = await request(app).put('/me/profile').set(AUTH).send(body);
        expect(res.status).toBe(400);
        expect(userService.saveProfile).not.toHaveBeenCalled();
    });
});

describe('DELETE /ticket/:ticketId', () => {
    it('deletes the ticket', async () => {
        const res = await request(app).delete('/ticket/100').set(AUTH);
        expect(res.body).toEqual({ message: 'Ticket deleted' });
        expect(ticketService.deleteTicket).toHaveBeenCalledWith(
            '100',
            TEST_SUB
        );
    });

    it('returns 404 for an unknown ticket', async () => {
        vi.mocked(ticketService.deleteTicket).mockRejectedValue(
            notFound('Ticket not found')
        );
        const res = await request(app).delete('/ticket/100').set(AUTH);
        expect(res.status).toBe(404);
    });

    it('returns 403 for someone other than the room admin', async () => {
        vi.mocked(ticketService.deleteTicket).mockRejectedValue(
            new AppError(403, 'Only the room admin can do that')
        );
        const res = await request(app).delete('/ticket/100').set(AUTH);
        expect(res.status).toBe(403);
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

describe('team routes', () => {
    it('require a login', async () => {
        const res = await request(app).get('/me/teams');
        expect(res.status).toBe(401);
    });

    it('GET /me/teams lists the callers teams', async () => {
        const body = { teams: [], isSuperAdmin: false };
        vi.mocked(teamService.getTeamsForUser).mockResolvedValue(body);
        const res = await request(app).get('/me/teams').set(AUTH);
        expect(res.body).toEqual(body);
        expect(teamService.getTeamsForUser).toHaveBeenCalledWith(TEST_SUB);
    });

    it('POST /teams creates a team', async () => {
        const team = makeTeam();
        vi.mocked(teamService.createTeam).mockResolvedValue(team);
        const res = await request(app)
            .post('/teams')
            .set(AUTH)
            .send({ name: 'Platform' });
        expect(res.status).toBe(201);
        expect(res.body).toEqual(team);
        expect(teamService.createTeam).toHaveBeenCalledWith(
            TEST_SUB,
            'Platform'
        );
    });

    it('rejects a team id that is not a number with 400', async () => {
        const res = await request(app).get('/teams/abc').set(AUTH);
        expect(res.status).toBe(400);
        expect(teamService.getTeamDetails).not.toHaveBeenCalled();
    });

    it('passes service errors through', async () => {
        vi.mocked(teamService.getTeamDetails).mockRejectedValue(
            notFound('Team not found')
        );
        const res = await request(app).get('/teams/9').set(AUTH);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Team not found' });
    });

    it('POST /teams/:id/members adds someone by email', async () => {
        const res = await request(app)
            .post('/teams/3/members')
            .set(AUTH)
            .send({ email: 'a@b.com', role: 'admin' });
        expect(res.status).toBe(201);
        expect(teamService.addMemberByEmail).toHaveBeenCalledWith(
            3,
            TEST_SUB,
            'a@b.com',
            'admin'
        );
    });

    it('PUT /teams/:id/members/:userId changes a role', async () => {
        const res = await request(app)
            .put('/teams/3/members/8')
            .set(AUTH)
            .send({ role: 'admin' });
        expect(res.status).toBe(200);
        expect(teamService.changeMemberRole).toHaveBeenCalledWith(
            3,
            TEST_SUB,
            8,
            'admin'
        );
    });

    it('DELETE /teams/:id/members/:userId removes a member', async () => {
        const res = await request(app).delete('/teams/3/members/8').set(AUTH);
        expect(res.status).toBe(200);
        expect(teamService.removeMember).toHaveBeenCalledWith(3, TEST_SUB, 8);
    });

    it('POST /teams/:id/owner hands the team over', async () => {
        const res = await request(app)
            .post('/teams/3/owner')
            .set(AUTH)
            .send({ userId: 8 });
        expect(res.status).toBe(200);
        expect(teamService.transferOwnership).toHaveBeenCalledWith(
            3,
            TEST_SUB,
            8
        );
        const bad = await request(app)
            .post('/teams/3/owner')
            .set(AUTH)
            .send({});
        expect(bad.status).toBe(400);
    });

    it('creates, lists and revokes invites', async () => {
        const invite = makeTeamInvite();
        vi.mocked(teamService.createInvite).mockResolvedValue(invite);
        vi.mocked(teamService.getInvites).mockResolvedValue([invite]);

        const created = await request(app)
            .post('/teams/3/invites')
            .set(AUTH)
            .send({ role: 'member', expiresInDays: 7 });
        expect(created.status).toBe(201);
        expect(teamService.createInvite).toHaveBeenCalledWith(
            3,
            TEST_SUB,
            'member',
            7
        );

        const listed = await request(app).get('/teams/3/invites').set(AUTH);
        expect(listed.body).toEqual({ invites: [invite] });

        const revoked = await request(app)
            .delete('/teams/3/invites/70')
            .set(AUTH);
        expect(revoked.status).toBe(200);
        expect(teamService.revokeInvite).toHaveBeenCalledWith(3, TEST_SUB, 70);
    });

    it('previews and accepts an invite by token', async () => {
        const preview = {
            teamId: 3,
            teamName: 'Platform',
            role: 'member' as const,
            alreadyMember: false,
        };
        vi.mocked(teamService.previewInvite).mockResolvedValue(preview);
        vi.mocked(teamService.acceptInvite).mockResolvedValue({ teamId: 3 });

        const got = await request(app).get('/invites/tok').set(AUTH);
        expect(got.body).toEqual(preview);
        expect(teamService.previewInvite).toHaveBeenCalledWith('tok', TEST_SUB);

        const accepted = await request(app)
            .post('/invites/tok/accept')
            .set(AUTH);
        expect(accepted.body).toEqual({ teamId: 3 });
    });
});
