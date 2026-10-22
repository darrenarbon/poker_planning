import { randomUUID } from 'crypto';

import * as roomRepository from '../repositories/roomRepository.js';
import * as ticketRepository from '../repositories/ticketRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import type { Room } from '../types/models.js';
import { notFound } from '../utils/errors.js';
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

export const getRoomsForUser = async (userSub: string) => {
    const user = await getUserBySub(userSub);
    return roomRepository.findRoomsByAdmin(user.user_id);
};

/** Room details, its users and its tickets (each with their votes). */
export const getRoomDetails = async (roomName: string) => {
    const room = await roomRepository.findRoomWithAdminSub(roomName);
    if (!room) {
        throw notFound('Room not found');
    }

    const userIds = await roomRepository.findRoomUserIds(room.room_id);
    const users = await userRepository.findUsersByIds(userIds);

    const tickets = await ticketRepository.findTicketsByRoom(room.room_id);
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
        },
    };
};

/** Adds the user to the room if needed and returns everyone in it. */
export const joinRoom = async (roomName: string, userSub: string) => {
    const room = await getRoomByName(roomName);
    const user = await getUserBySub(userSub);

    if (!(await roomRepository.isUserInRoom(room.room_id, user.user_id))) {
        await roomRepository.addUserToRoom(room.room_id, user.user_id);
    }

    return roomRepository.findUsersInRoom(room.room_id);
};
