import { randomUUID } from 'crypto';

import * as roomRepository from '../repositories/roomRepository.js';
import * as ticketRepository from '../repositories/ticketRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import type { Room, UserRoom } from '../types/models.js';
import { AppError, notFound } from '../utils/errors.js';
import { getUserBySub } from './userService.js';

export const getRoomByName = async (roomName: string): Promise<Room> => {
    const room = await roomRepository.findRoomByName(roomName);
    if (!room) {
        throw notFound('Room not found');
    }
    return room;
};

export const createRoom = async (
    adminSub: string,
    friendlyName: string,
    ticketBaseUrl: string
) => {
    const admin = await getUserBySub(adminSub);
    const roomName = randomUUID().substring(0, 10);

    const room = await roomRepository.createRoom({
        room_name: roomName,
        admin_id: admin.user_id,
        friendly_name: friendlyName,
        ticket_base_url: ticketBaseUrl,
    });
    await roomRepository.addUserToRoom(room.room_id, admin.user_id);

    return roomName;
};

/** Every room the user created or joined, with their favourite flag and last visit. */
export const getRoomsForUser = async (userSub: string): Promise<UserRoom[]> => {
    const user = await getUserBySub(userSub);
    const [adminRooms, memberships] = await Promise.all([
        roomRepository.findRoomsByAdmin(user.user_id),
        roomRepository.findMemberships(user.user_id),
    ]);

    const rooms = new Map<number, UserRoom>();
    for (const { room, favourite, last_joined_at } of memberships) {
        if (!room) continue;
        rooms.set(room.room_id, {
            ...room,
            hidden: !!room.hidden,
            is_admin: room.admin_id === user.user_id,
            favourite: !!favourite,
            last_joined_at,
        });
    }
    for (const room of adminRooms) {
        if (!rooms.has(room.room_id)) {
            rooms.set(room.room_id, {
                ...room,
                hidden: !!room.hidden,
                is_admin: true,
                favourite: false,
                last_joined_at: null,
            });
        }
    }
    return [...rooms.values()].sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
    );
};

const getRoomAsAdmin = async (roomName: string, userSub: string) => {
    const room = await getRoomByName(roomName);
    const user = await getUserBySub(userSub);
    if (room.admin_id !== user.user_id) {
        throw new AppError(403, 'Only the room admin can do that');
    }
    return room;
};

/** Stars or un-stars a room for one user, joining them to it if needed. */
export const setFavourite = async (
    roomName: string,
    userSub: string,
    favourite: boolean
) => {
    const room = await getRoomByName(roomName);
    const user = await getUserBySub(userSub);
    if (!(await roomRepository.isUserInRoom(room.room_id, user.user_id))) {
        await roomRepository.addUserToRoom(room.room_id, user.user_id);
    }
    await roomRepository.updateMembership(room.room_id, user.user_id, {
        favourite,
    });
};

/** Lets the room's admin hide a finished room from everyone's lists, or bring it back. */
export const setHidden = async (
    roomName: string,
    userSub: string,
    hidden: boolean
) => {
    const room = await getRoomAsAdmin(roomName, userSub);
    await roomRepository.updateRoomHidden(room.room_id, hidden);
};

/** Lets the room's admin change the base URL used to build ticket links. */
export const updateBaseUrl = async (
    roomName: string,
    userSub: string,
    baseUrl: string
) => {
    const room = await getRoomAsAdmin(roomName, userSub);
    await roomRepository.updateRoomBaseUrl(room.room_id, baseUrl);
};

/** Room details, its users and its tickets (each with their votes). */
export const getRoomDetails = async (roomName: string, userSub?: string) => {
    const room = await roomRepository.findRoomWithAdminSub(roomName);
    if (!room) {
        throw notFound('Room not found');
    }

    const userIds = await roomRepository.findRoomUserIds(room.room_id);
    const users = await userRepository.findUsersByIds(userIds);

    const tickets = await ticketRepository.findTicketsByRoom(room.room_id);
    const viewer = userSub
        ? users.find((u) => u.auth0_sub === userSub)
        : undefined;
    const membership = viewer
        ? await roomRepository.findMembership(room.room_id, viewer.user_id)
        : undefined;
    const votes = await voteRepository.findVotesForTickets(
        tickets.map((ticket) => ticket.ticket_id)
    );

    return {
        tickets: tickets.map((ticket) => ({
            ...ticket,
            votes: votes
                .filter((vote) => vote.ticket_id === ticket.ticket_id)
                .map(({ vote, usersub }) => ({ vote, usersub })),
        })),
        users,
        room: {
            adminSub: room.auth0_sub,
            createdAt: room.created_at,
            friendlyName: room.friendly_name,
            roomId: room.room_id,
            roomName: room.room_name,
            ticketBaseUrl: room.ticket_base_url,
            hidden: !!room.hidden,
            favourite: !!membership?.favourite,
        },
    };
};

/** Adds the user to the room if needed and returns everyone in it. */
export const joinRoom = async (roomName: string, userSub: string) => {
    const room = await getRoomByName(roomName);
    const user = await getUserBySub(userSub);

    if (await roomRepository.isUserInRoom(room.room_id, user.user_id)) {
        await roomRepository.updateMembership(room.room_id, user.user_id, {
            last_joined_at: new Date().toISOString(),
        });
    } else {
        await roomRepository.addUserToRoom(room.room_id, user.user_id);
    }

    return roomRepository.findUsersInRoom(room.room_id);
};
