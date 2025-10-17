import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import type { JoinPayload, EventHandler } from '../types/socketTypes';
import {
    emitError,
    logSocketEvent,
    validatePayload,
} from '../utils/socketUtils';
import { handleJoinRoom } from '../services/socketRoomService';

/**
 * Handler for 'join' socket events
 * Manages user joining rooms and notifying other users
 */
export const joinHandler: EventHandler<JoinPayload> = async (
    { roomName, userSub }: JoinPayload,
    socket: Socket,
    io: IOServer
): Promise<void> => {
    try {
        // Validate payload
        const validationError = validatePayload({ roomName, userSub }, [
            'roomName',
            'userSub',
        ]);
        if (validationError) {
            return emitError(socket, null, validationError);
        }

        // Log the join event
        logSocketEvent('join', roomName, userSub);

        // Join the socket room
        socket.join(roomName);

        // Handle the room join logic
        const result = await handleJoinRoom(roomName, userSub);

        if (!result.success) {
            return emitError(
                socket,
                result.error,
                result.message || 'Error joining room'
            );
        }

        // Notify other users in the room
        socket.to(roomName).emit('userJoined', { users: result.users });
    } catch (error) {
        emitError(socket, error, 'Unexpected error during join');
    }
};
