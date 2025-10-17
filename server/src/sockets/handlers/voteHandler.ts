import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import type { VotePayload, EventHandler } from '../types/socketTypes';
import {
    emitError,
    logSocketEvent,
    validatePayload,
} from '../utils/socketUtils';
import { handleVote } from '../services/socketVoteService';

/**
 * Handler for 'vote' socket events
 * Manages user voting on tickets
 */
export const voteHandler: EventHandler<VotePayload> = async (
    { roomName, ticketId, vote, userSub }: VotePayload,
    socket: Socket,
    io: IOServer
): Promise<void> => {
    try {
        // Validate payload
        const validationError = validatePayload(
            { roomName, ticketId, vote, userSub },
            ['roomName', 'ticketId', 'userSub']
        );
        if (validationError) {
            return emitError(socket, null, validationError);
        }

        // Log the vote event
        logSocketEvent('vote', roomName, ticketId, vote, userSub);

        // Handle the voting logic
        const result = await handleVote(ticketId, vote, userSub);

        if (!result.success) {
            return emitError(
                socket,
                result.error,
                result.message || 'Error processing vote'
            );
        }

        // Notify other users in the room about the vote
        socket.to(roomName).emit('voteReceived', { ticketId, vote, userSub });
    } catch (error) {
        emitError(socket, error, 'Unexpected error during voting');
    }
};
