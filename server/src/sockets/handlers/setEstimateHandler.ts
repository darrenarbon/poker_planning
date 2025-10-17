import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import type { SetEstimatePayload, EventHandler } from '../types/socketTypes';
import {
    emitError,
    logSocketEvent,
    validatePayload,
} from '../utils/socketUtils';
import { handleSetEstimate } from '../services/socketTicketService';

/**
 * Handler for 'setEstimate' socket events
 * Updates ticket with final estimate and broadcasts to room users
 */
export const setEstimateHandler: EventHandler<SetEstimatePayload> = async (
    { roomName, currentTicket }: SetEstimatePayload,
    socket: Socket,
    io: IOServer
): Promise<void> => {
    try {
        // Validate payload
        const validationError = validatePayload({ roomName, currentTicket }, [
            'roomName',
            'currentTicket',
        ]);
        if (validationError) {
            return emitError(socket, null, validationError);
        }

        // Validate current ticket data
        const { ticket_id, chosen_estimate, average_vote, standard_deviation } =
            currentTicket;
        const ticketValidationError = validatePayload(
            { ticket_id, chosen_estimate, average_vote, standard_deviation },
            [
                'ticket_id',
                'chosen_estimate',
                'average_vote',
                'standard_deviation',
            ]
        );
        if (ticketValidationError) {
            return emitError(
                socket,
                null,
                `Invalid ticket data: ${ticketValidationError}`
            );
        }

        // Log the set estimate event
        logSocketEvent(
            'setEstimate',
            ticket_id,
            chosen_estimate,
            average_vote,
            standard_deviation
        );

        // Handle the estimate setting logic
        const result = await handleSetEstimate(
            roomName,
            ticket_id,
            chosen_estimate,
            average_vote,
            standard_deviation
        );

        if (!result.success) {
            return emitError(
                socket,
                result.error,
                result.message || 'Error setting estimate'
            );
        }

        console.log('ticket updated');

        // Broadcast estimate to other users in the room
        socket.to(roomName).emit('showEstimate', { currentTicket });
    } catch (error) {
        emitError(socket, error, 'Unexpected error during estimate setting');
    }
};
