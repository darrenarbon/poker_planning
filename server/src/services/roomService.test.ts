import { describe, expect, it, vi } from 'vitest';

import * as roomRepository from '../repositories/roomRepository.js';
import * as ticketRepository from '../repositories/ticketRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import { makeRoom, makeTicket, makeUser } from '../test/factories.js';
import {
    createRoom,
    getRoomByName,
    getRoomDetails,
    getRoomsForUser,
    joinRoom,
    setFavourite,
    setHidden,
    updateBaseUrl,
} from './roomService.js';

vi.mock('../repositories/roomRepository.js');
vi.mock('../repositories/ticketRepository.js');
vi.mock('../repositories/userRepository.js');
vi.mock('../repositories/voteRepository.js');

const user = makeUser();
const room = makeRoom();

describe('getRoomByName', () => {
    it('returns the room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        await expect(getRoomByName(room.room_name)).resolves.toEqual(room);
    });

    it('throws 404 when missing', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(undefined);
        await expect(getRoomByName('nope')).rejects.toMatchObject({
            status: 404,
            message: 'Room not found',
        });
    });
});

describe('createRoom', () => {
    it('creates a room with a 10 character name and adds the admin', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(roomRepository.createRoom).mockResolvedValue(room);

        const roomName = await createRoom(user.auth0_sub, 'Sprint', 'url');

        expect(roomName).toHaveLength(10);
        expect(roomRepository.createRoom).toHaveBeenCalledWith({
            room_name: roomName,
            admin_id: user.user_id,
            friendly_name: 'Sprint',
            ticket_base_url: 'url',
        });
        expect(roomRepository.addUserToRoom).toHaveBeenCalledWith(
            room.room_id,
            user.user_id
        );
    });

    it('throws 404 when the admin does not exist', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(undefined);
        await expect(createRoom('nobody', 'x', 'y')).rejects.toMatchObject({
            status: 404,
        });
        expect(roomRepository.createRoom).not.toHaveBeenCalled();
    });
});

describe('getRoomsForUser', () => {
    it('merges created and joined rooms, newest first', async () => {
        const created = makeRoom({
            room_id: 1,
            admin_id: user.user_id,
            created_at: '2026-01-01T00:00:00Z',
        });
        const joined = makeRoom({
            room_id: 2,
            admin_id: 99,
            hidden: true,
            created_at: '2026-02-01T00:00:00Z',
        });
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(roomRepository.findRoomsByAdmin).mockResolvedValue([created]);
        vi.mocked(roomRepository.findMemberships).mockResolvedValue([
            { room: created, favourite: false, last_joined_at: null },
            { room: joined, favourite: true, last_joined_at: '2026-02-02' },
        ]);

        await expect(getRoomsForUser(user.auth0_sub)).resolves.toEqual([
            {
                ...joined,
                hidden: true,
                is_admin: false,
                favourite: true,
                last_joined_at: '2026-02-02',
            },
            {
                ...created,
                hidden: false,
                is_admin: true,
                favourite: false,
                last_joined_at: null,
            },
        ]);
    });

    it('includes created rooms the admin was never added to', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(roomRepository.findRoomsByAdmin).mockResolvedValue([room]);
        vi.mocked(roomRepository.findMemberships).mockResolvedValue([]);
        const [result] = await getRoomsForUser(user.auth0_sub);
        expect(result).toMatchObject({ room_id: room.room_id, is_admin: true });
    });
});

describe('setFavourite', () => {
    it('joins the user if needed and saves the flag', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(roomRepository.isUserInRoom).mockResolvedValue(false);
        await setFavourite(room.room_name, user.auth0_sub, true);
        expect(roomRepository.addUserToRoom).toHaveBeenCalledWith(
            room.room_id,
            user.user_id
        );
        expect(roomRepository.updateMembership).toHaveBeenCalledWith(
            room.room_id,
            user.user_id,
            { favourite: true }
        );
    });
});

describe('setHidden', () => {
    it('lets the admin hide the room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(
            makeRoom({ admin_id: 1 })
        );
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 1 })
        );
        await setHidden('abc', 'auth0|user-1', true);
        expect(roomRepository.updateRoomHidden).toHaveBeenCalledWith(10, true);
    });

    it('refuses anyone else with 403', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(
            makeRoom({ admin_id: 1 })
        );
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 2 })
        );
        await expect(
            setHidden('abc', 'auth0|other', true)
        ).rejects.toMatchObject({ status: 403 });
        expect(roomRepository.updateRoomHidden).not.toHaveBeenCalled();
    });
});

describe('getRoomDetails', () => {
    it('returns the room, its users and tickets with their votes', async () => {
        const t1 = makeTicket({ ticket_id: 1 });
        const t2 = makeTicket({ ticket_id: 2, ticket_number: 'PP-2' });
        vi.mocked(roomRepository.findRoomWithAdminSub).mockResolvedValue({
            ...room,
            auth0_sub: 'auth0|admin',
        });
        vi.mocked(roomRepository.findRoomUserIds).mockResolvedValue([1]);
        vi.mocked(userRepository.findUsersByIds).mockResolvedValue([user]);
        vi.mocked(ticketRepository.findTicketsByRoom).mockResolvedValue([
            t1,
            t2,
        ]);
        vi.mocked(voteRepository.findVotesForTickets).mockResolvedValue([
            { vote: '3', ticket_id: 1, usersub: 'a' },
            { vote: '5', ticket_id: 1, usersub: 'b' },
        ]);

        const details = await getRoomDetails(room.room_name);

        expect(voteRepository.findVotesForTickets).toHaveBeenCalledWith([1, 2]);
        expect(details).toEqual({
            tickets: [
                {
                    ...t1,
                    votes: [
                        { vote: '3', usersub: 'a' },
                        { vote: '5', usersub: 'b' },
                    ],
                },
                { ...t2, votes: [] },
            ],
            users: [user],
            room: {
                adminSub: 'auth0|admin',
                createdAt: room.created_at,
                friendlyName: room.friendly_name,
                roomId: room.room_id,
                roomName: room.room_name,
                ticketBaseUrl: room.ticket_base_url,
                hidden: false,
                favourite: false,
            },
        });
    });

    it("includes the viewer's favourite flag", async () => {
        vi.mocked(roomRepository.findRoomWithAdminSub).mockResolvedValue({
            ...room,
            auth0_sub: 'auth0|admin',
        });
        vi.mocked(roomRepository.findRoomUserIds).mockResolvedValue([1]);
        vi.mocked(userRepository.findUsersByIds).mockResolvedValue([user]);
        vi.mocked(ticketRepository.findTicketsByRoom).mockResolvedValue([]);
        vi.mocked(voteRepository.findVotesForTickets).mockResolvedValue([]);
        vi.mocked(roomRepository.findMembership).mockResolvedValue({
            favourite: true,
            last_joined_at: null,
        });
        const details = await getRoomDetails(room.room_name, user.auth0_sub);
        expect(details.room.favourite).toBe(true);
    });

    it('throws 404 when the room does not exist', async () => {
        vi.mocked(roomRepository.findRoomWithAdminSub).mockResolvedValue(
            undefined
        );
        await expect(getRoomDetails('nope')).rejects.toMatchObject({
            status: 404,
        });
    });
});

describe('joinRoom', () => {
    const users = [user, makeUser({ user_id: 2 })];

    it('adds a new user to the room and returns everyone', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(roomRepository.isUserInRoom).mockResolvedValue(false);
        vi.mocked(roomRepository.findUsersInRoom).mockResolvedValue(users);

        await expect(joinRoom(room.room_name, user.auth0_sub)).resolves.toEqual(
            users
        );
        expect(roomRepository.addUserToRoom).toHaveBeenCalledWith(
            room.room_id,
            user.user_id
        );
    });

    it('does not re-add a user already in the room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(roomRepository.isUserInRoom).mockResolvedValue(true);
        vi.mocked(roomRepository.findUsersInRoom).mockResolvedValue(users);

        await joinRoom(room.room_name, user.auth0_sub);
        expect(roomRepository.addUserToRoom).not.toHaveBeenCalled();
        expect(roomRepository.updateMembership).toHaveBeenCalledWith(
            room.room_id,
            user.user_id,
            { last_joined_at: expect.any(String) }
        );
    });

    it('throws 404 for an unknown room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(undefined);
        await expect(joinRoom('nope', user.auth0_sub)).rejects.toMatchObject({
            message: 'Room not found',
        });
    });
});

describe('updateBaseUrl', () => {
    it('lets the admin update the base url', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(
            makeRoom({ admin_id: 1 })
        );
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 1 })
        );
        await updateBaseUrl('abc', 'auth0|user-1', 'https://new');
        expect(roomRepository.updateRoomBaseUrl).toHaveBeenCalledWith(
            10,
            'https://new'
        );
    });

    it('refuses anyone else with 403', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(
            makeRoom({ admin_id: 1 })
        );
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 2 })
        );
        await expect(
            updateBaseUrl('abc', 'auth0|other', 'https://new')
        ).rejects.toMatchObject({ status: 403 });
    });
});
