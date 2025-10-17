import type { UserData, RoomData, RoomUserData } from '../types/socketTypes';
import {
    findRoomByName,
    findUserByAuth0Sub,
    findUserInRoom,
    addUserToRoom,
    getUsersInRoom,
} from '../utils/socketDatabase';

/**
 * Service for room-related operations
 */

export interface JoinRoomResult {
    success: boolean;
    users?: any[];
    error?: any;
    message?: string;
}

/**
 * Handles user joining a room
 * Validates room and user, adds user to room if not already present
 */
export const handleJoinRoom = async (
    roomName: string,
    userSub: string
): Promise<JoinRoomResult> => {
    try {
        // Get room data
        const { data: roomData, error: roomError } = await findRoomByName(
            roomName
        );
        if (roomError) {
            return {
                success: false,
                error: roomError,
                message: 'Error getting room',
            };
        }
        if (!roomData || roomData.length === 0) {
            return { success: false, error: null, message: 'Room not found' };
        }

        // Get user data
        const { data: userData, error: userError } = await findUserByAuth0Sub(
            userSub
        );
        if (userError) {
            return {
                success: false,
                error: userError,
                message: 'Error getting user',
            };
        }
        if (!userData || userData.length === 0) {
            return { success: false, error: null, message: 'User not found' };
        }

        const room = roomData[0];
        const user = userData[0];

        // Check if user is already in room
        const { data: userInRoomData, error: userInRoomError } =
            await findUserInRoom(room.room_id, user.user_id);
        if (userInRoomError) {
            return {
                success: false,
                error: userInRoomError,
                message: 'Error getting user in room',
            };
        }

        // Add user to room if not already present
        if (!userInRoomData || userInRoomData.length === 0) {
            const { error: insertUserInRoomError } = await addUserToRoom(
                room.room_id,
                user.user_id
            );
            if (insertUserInRoomError) {
                return {
                    success: false,
                    error: insertUserInRoomError,
                    message: 'Error adding user to room',
                };
            }
        }

        // Get all users in room
        const { data: usersInRoomData, error: usersInRoomError } =
            await getUsersInRoom(room.room_id);
        if (usersInRoomError) {
            return {
                success: false,
                error: usersInRoomError,
                message: 'Error getting users in room',
            };
        }

        // Format users for response
        const users = (usersInRoomData ?? []).map((roomUser: RoomUserData) => ({
            ...roomUser.user,
        }));

        return { success: true, users };
    } catch (error) {
        return {
            success: false,
            error,
            message: 'Unexpected error during room join',
        };
    }
};
