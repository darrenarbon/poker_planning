import { randomUUID } from 'crypto';

import * as roomRepository from '../repositories/roomRepository.js';
import * as ticketRepository from '../repositories/ticketRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import type { Room, Ticket, UserRoom } from '../types/models.js';
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

/** Throws a 403 unless the user is the room's owner or a co-facilitator. */
export const assertRoomAdmin = async (room: Room, userSub: string) => {
    const user = await getUserBySub(userSub);
    if (room.admin_id === user.user_id) return room;
    const coFacilitatorIds = await roomRepository.findCoFacilitatorIds(
        room.room_id
    );
    if (!coFacilitatorIds.includes(user.user_id)) {
        throw new AppError(403, 'Only a facilitator can do that');
    }
    return room;
};

/** Throws a 403 unless the user owns the room (co-facilitators do not). */
const assertRoomOwner = async (room: Room, userSub: string) => {
    const user = await getUserBySub(userSub);
    if (room.admin_id !== user.user_id) {
        throw new AppError(403, 'Only the room owner can do that');
    }
    return user;
};

export const getRoomAsAdmin = async (roomName: string, userSub: string) =>
    assertRoomAdmin(await getRoomByName(roomName), userSub);

export const getRoomByIdAsAdmin = async (roomId: number, userSub: string) => {
    const room = await roomRepository.findRoomById(roomId);
    if (!room) {
        throw notFound('Room not found');
    }
    return assertRoomAdmin(room, userSub);
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

    const [tickets, archived, coFacilitatorIds] = await Promise.all([
        ticketRepository.findTicketsByRoom(room.room_id),
        ticketRepository.findArchivedTicketsByRoom(room.room_id),
        roomRepository.findCoFacilitatorIds(room.room_id),
    ]);
    const viewer = userSub
        ? users.find((u) => u.auth0_sub === userSub)
        : undefined;
    const membership = viewer
        ? await roomRepository.findMembership(room.room_id, viewer.user_id)
        : undefined;
    const votes = await voteRepository.findVotesForTickets(
        [...tickets, ...archived].map((ticket) => ticket.ticket_id)
    );
    const withVotes = (ticket: Ticket) => ({
        ...ticket,
        votes: votes
            .filter((vote) => vote.ticket_id === ticket.ticket_id)
            .map(({ vote, usersub }) => ({ vote, usersub })),
    });

    return {
        tickets: tickets.map(withVotes),
        archivedTickets: archived.map(withVotes),
        users,
        room: {
            adminSub: room.auth0_sub,
            coFacilitatorSubs: users
                .filter((u) => coFacilitatorIds.includes(u.user_id))
                .map((u) => u.auth0_sub),
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

/** Who runs the room: the owner and the co-facilitators, by auth0 sub. */
export const getFacilitators = async (roomName: string) => {
    const room = await getRoomByName(roomName);
    const coFacilitatorIds = await roomRepository.findCoFacilitatorIds(
        room.room_id
    );
    const users = await userRepository.findUsersByIds([
        room.admin_id,
        ...coFacilitatorIds,
    ]);
    const subOf = (userId: number) =>
        users.find((u) => u.user_id === userId)?.auth0_sub;
    return {
        adminSub: subOf(room.admin_id) ?? '',
        coFacilitatorSubs: coFacilitatorIds
            .map(subOf)
            .filter((sub): sub is string => !!sub),
    };
};

/** A user who has joined the room, for facilitator changes. */
const getRoomMember = async (room: Room, userSub: string) => {
    const user = await getUserBySub(userSub);
    if (!(await roomRepository.isUserInRoom(room.room_id, user.user_id))) {
        throw notFound('That person has not joined this room');
    }
    return user;
};

/** The owner shares admin rights with someone in the room. */
export const addCoFacilitator = async (
    roomName: string,
    ownerSub: string,
    targetSub: string
) => {
    const room = await getRoomByName(roomName);
    const owner = await assertRoomOwner(room, ownerSub);
    const target = await getRoomMember(room, targetSub);
    if (target.user_id === owner.user_id) {
        throw new AppError(400, 'You already own this room');
    }
    await roomRepository.addCoFacilitator(room.room_id, target.user_id);
};

/** Only the owner can take admin rights away from a co-facilitator. */
export const removeCoFacilitator = async (
    roomName: string,
    ownerSub: string,
    targetSub: string
) => {
    const room = await getRoomByName(roomName);
    await assertRoomOwner(room, ownerSub);
    const target = await getUserBySub(targetSub);
    await roomRepository.removeCoFacilitator(room.room_id, target.user_id);
};

/** Makes someone in the room its owner; the old owner stays a co-facilitator. */
export const handOverRoom = async (
    roomName: string,
    ownerSub: string,
    targetSub: string
) => {
    const room = await getRoomByName(roomName);
    const owner = await assertRoomOwner(room, ownerSub);
    const target = await getRoomMember(room, targetSub);
    if (target.user_id === owner.user_id) {
        throw new AppError(400, 'You already own this room');
    }
    await roomRepository.updateRoomOwner(room.room_id, target.user_id);
    await roomRepository.removeCoFacilitator(room.room_id, target.user_id);
    await roomRepository.addCoFacilitator(room.room_id, owner.user_id);
};
