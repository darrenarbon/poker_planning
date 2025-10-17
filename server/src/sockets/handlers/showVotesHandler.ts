import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import type { ShowVotesPayload, EventHandler } from '../types/socketTypes';
import {
    emitError,
    logSocketEvent,
    validatePayload,
} from '../utils/socketUtils';
import { validateTicketAndRoom } from '../services/socketTicketService';

/**
 * Handler for 'showVotes' socket events
 * Validates ticket and room, then broadcasts vote reveal to all users
 */
export const showVotesHandler: EventHandler<ShowVotesPayload> = async (
    { roomName, ticketId }: ShowVotesPayload,
    socket: Socket,
    io: IOServer
): Promise<void> => {
    try {
        // Validate payload
        const validationError = validatePayload({ roomName, ticketId }, [
            'roomName',
            'ticketId',
        ]);
        if (validationError) {
            return emitError(socket, null, validationError);
        }

        // Log the show votes event
        logSocketEvent('showVotes', roomName, ticketId);

        // Validate that ticket exists and belongs to the room
        const result = await validateTicketAndRoom(ticketId, roomName);

        if (!result.success) {
            return emitError(
                socket,
                result.error,
                result.message || 'Error validating ticket'
            );
        }

        // Broadcast to all users in the room (including sender)
        io.in(roomName).emit('showVotes', { ticketId });
    } catch (error) {
        emitError(socket, error, 'Unexpected error during show votes');
    }
};
