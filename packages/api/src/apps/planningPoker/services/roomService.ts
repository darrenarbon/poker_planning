import { randomUUID } from 'crypto';

import * as roomRepository from '../repositories/roomRepository.js';
import * as ticketRepository from '../repositories/ticketRepository.js';
import * as teamRepository from '../../../repositories/teamRepository.js';
import * as userRepository from '../../../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import type { Room, Ticket, User, UserRoom } from '../../../types/models.js';
import { AppError, notFound } from '../../../utils/errors.js';
import { canManageTeam, isTeamMember } from '../../../services/teamService.js';
import { getUserBySub } from '../../../services/userService.js';

export const getRoomByName = async (roomName: string): Promise<Room> => {
    const room = await roomRepository.findRoomByName(roomName);
    if (!room) {
        throw notFound('Room not found');
    }
    return room;
};

/** Where a new room belongs and who from that team to put in it. */
export interface NewRoomOptions {
    teamId?: number;
    /** when the planning session happens, an ISO 8601 timestamp */
    scheduledAt?: string;
    /** team members to add to the room, by auth0 sub */
    memberSubs?: string[];
    /** team members who also share the owner's facilitator rights */
    coFacilitatorSubs?: string[];
}

/** The team members picked for a new room, checked against the team. */
const pickTeamMembers = async (
    creator: User,
    { teamId, memberSubs = [], coFacilitatorSubs = [] }: NewRoomOptions
) => {
    if (teamId === undefined) {
        if (memberSubs.length || coFacilitatorSubs.length) {
            throw new AppError(400, 'Choose a team to add people from');
        }
        return { members: [], coFacilitators: [] };
    }

    if (!(await teamRepository.findTeamById(teamId))) {
        throw notFound('Team not found');
    }
    if (!(await isTeamMember(creator, teamId))) {
        throw new AppError(403, 'You are not in that team');
    }

    const teamUsers = (await teamRepository.findMembers(teamId)).map(
        (m) => m.user
    );
    const find = (sub: string) => {
        const user = teamUsers.find((u) => u.auth0_sub === sub);
        if (!user) {
            throw new AppError(400, 'You can only add people from the team');
        }
        return user;
    };
    const coFacilitators = coFacilitatorSubs.map(find);
    const members = [...new Set([...memberSubs, ...coFacilitatorSubs])].map(
        find
    );
    return { members, coFacilitators };
};

export const createRoom = async (
    adminSub: string,
    friendlyName: string,
    ticketBaseUrl: string,
    options: NewRoomOptions = {}
) => {
    const admin = await getUserBySub(adminSub);
    const { members, coFacilitators } = await pickTeamMembers(admin, options);
    const roomName = randomUUID().substring(0, 10);

    const room = await roomRepository.createRoom({
        room_name: roomName,
        admin_id: admin.user_id,
        friendly_name: friendlyName,
        ticket_base_url: ticketBaseUrl,
        ...(options.teamId !== undefined && { team_id: options.teamId }),
        ...(options.scheduledAt && { scheduled_at: options.scheduledAt }),
    });
    await roomRepository.addUserToRoom(room.room_id, admin.user_id);

    const others = members.filter((u) => u.user_id !== admin.user_id);
    await roomRepository.addUsersToRoom(
        room.room_id,
        others.map((u) => u.user_id)
    );
    for (const user of coFacilitators) {
        if (user.user_id !== admin.user_id) {
            await roomRepository.addCoFacilitator(room.room_id, user.user_id);
        }
    }

    return roomName;
};

/**
 * Every room the user created or joined, plus the rooms of teams they own or
 * administer, or every room for a super admin.
 */
export const getRoomsForUser = async (userSub: string): Promise<UserRoom[]> => {
    const user = await getUserBySub(userSub);
    const [adminRooms, memberships, managedRooms] = await Promise.all([
        roomRepository.findRoomsByAdmin(user.user_id),
        roomRepository.findMemberships(user.user_id),
        findManagedRooms(user),
    ]);
    const managedIds = new Set(managedRooms.map((r) => r.room_id));

    const rooms = new Map<number, UserRoom>();
    for (const { room, favourite, last_joined_at } of memberships) {
        if (!room) continue;
        rooms.set(room.room_id, {
            ...room,
            hidden: !!room.hidden,
            is_admin:
                room.admin_id === user.user_id || managedIds.has(room.room_id),
            favourite: !!favourite,
            last_joined_at,
        });
    }
    for (const room of [...adminRooms, ...managedRooms]) {
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

const findManagedRooms = async (user: User): Promise<Room[]> => {
    if (user.is_super_admin) return roomRepository.findAllRooms();
    return roomRepository.findRoomsByTeamIds(
        await teamRepository.findManagedTeamIds(user.user_id)
    );
};

/** Whether the user can run the room as a super admin or its team's owner or admin. */
const canManageRoom = async (user: User, room: Room): Promise<boolean> => {
    if (user.is_super_admin) return true;
    return !!room.team_id && (await canManageTeam(user, room.team_id));
};

/**
 * Throws a 403 unless the user is the room's owner, a co-facilitator, a super
 * admin, or the owner or an admin of the room's team.
 */
export const assertRoomAdmin = async (room: Room, userSub: string) => {
    const user = await getUserBySub(userSub);
    if (room.admin_id === user.user_id || user.is_super_admin) return room;
    const coFacilitatorIds = await roomRepository.findCoFacilitatorIds(
        room.room_id
    );
    if (
        !coFacilitatorIds.includes(user.user_id) &&
        !(await canManageRoom(user, room))
    ) {
        throw new AppError(403, 'Only a facilitator can do that');
    }
    return room;
};

/**
 * Throws a 403 unless the user owns the room or can manage it as a super
 * admin or team owner or admin (co-facilitators cannot).
 */
const assertRoomOwner = async (room: Room, userSub: string) => {
    const user = await getUserBySub(userSub);
    if (room.admin_id !== user.user_id && !(await canManageRoom(user, room))) {
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

/** Lets the room's admin move the planning session to another date and time. */
export const updateScheduledAt = async (
    roomName: string,
    userSub: string,
    scheduledAt: string
) => {
    const room = await getRoomAsAdmin(roomName, userSub);
    await roomRepository.updateRoomScheduledAt(room.room_id, scheduledAt);
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

    const [tickets, archived, coFacilitatorIds, exemplars] = await Promise.all([
        ticketRepository.findTicketsByRoom(room.room_id),
        ticketRepository.findArchivedTicketsByRoom(room.room_id),
        roomRepository.findCoFacilitatorIds(room.room_id),
        userRepository.findExemplars(room.admin_id),
    ]);
    const viewer = userSub
        ? users.find((u) => u.auth0_sub === userSub)
        : undefined;
    // a super admin or team admin can open a room they never joined
    const viewerUser =
        viewer ??
        (userSub ? await userRepository.findUserBySub(userSub) : undefined);
    const isOwner = !!viewerUser && viewerUser.user_id === room.admin_id;
    const canManageOwnership =
        isOwner || (!!viewerUser && (await canManageRoom(viewerUser, room)));
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
            scheduledAt: room.scheduled_at,
            friendlyName: room.friendly_name,
            roomId: room.room_id,
            roomName: room.room_name,
            ticketBaseUrl: room.ticket_base_url,
            hidden: !!room.hidden,
            favourite: !!membership?.favourite,
            exemplars,
            teamId: room.team_id ?? null,
            // has facilitator rights, by owning or co-facilitating the room
            // or managing its team, or as a super admin
            canManage:
                canManageOwnership ||
                (!!viewerUser && coFacilitatorIds.includes(viewerUser.user_id)),
            // can change co-facilitators and hand the room over
            canManageOwnership,
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

/**
 * Someone who can be given facilitator changes: a user who has joined the
 * room, or a member of the room's team, who is added to the room first.
 */
const getRoomMember = async (room: Room, userSub: string) => {
    const user = await getUserBySub(userSub);
    if (await roomRepository.isUserInRoom(room.room_id, user.user_id)) {
        return user;
    }
    if (
        room.team_id &&
        (await teamRepository.findMember(room.team_id, user.user_id))
    ) {
        await roomRepository.addUserToRoom(room.room_id, user.user_id);
        return user;
    }
    throw notFound('That person has not joined this room');
};

/** The owner shares admin rights with someone in the room. */
export const addCoFacilitator = async (
    roomName: string,
    ownerSub: string,
    targetSub: string
) => {
    const room = await getRoomByName(roomName);
    await assertRoomOwner(room, ownerSub);
    const target = await getRoomMember(room, targetSub);
    if (target.user_id === room.admin_id) {
        throw new AppError(400, 'They already own this room');
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
    await assertRoomOwner(room, ownerSub);
    const target = await getRoomMember(room, targetSub);
    if (target.user_id === room.admin_id) {
        throw new AppError(400, 'They already own this room');
    }
    // whoever made the change, the previous owner stays on as a co-facilitator
    const previousOwnerId = room.admin_id;
    await roomRepository.updateRoomOwner(room.room_id, target.user_id);
    await roomRepository.removeCoFacilitator(room.room_id, target.user_id);
    await roomRepository.addCoFacilitator(room.room_id, previousOwnerId);
};

/** A facilitator brings more of the room's team into it. */
export const addTeamMembersToRoom = async (
    roomName: string,
    userSub: string,
    memberSubs: string[]
) => {
    const room = await getRoomAsAdmin(roomName, userSub);
    if (!room.team_id) {
        throw new AppError(400, 'This room does not belong to a team');
    }
    const teamUsers = (await teamRepository.findMembers(room.team_id)).map(
        (m) => m.user
    );
    const users = memberSubs.map((sub) => {
        const user = teamUsers.find((u) => u.auth0_sub === sub);
        if (!user) {
            throw new AppError(400, 'You can only add people from the team');
        }
        return user;
    });
    await roomRepository.addUsersToRoom(
        room.room_id,
        users.map((u) => u.user_id)
    );
};
