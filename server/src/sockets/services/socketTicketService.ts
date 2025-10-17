import type { TicketData, RoomData } from '../types/socketTypes';
import {
    findTicketById,
    findRoomByIdAndName,
    findRoomByName,
    updateTicketEstimate,
} from '../utils/socketDatabase';

/**
 * Service for ticket operations
 */

export interface ShowVotesResult {
    success: boolean;
    error?: any;
    message?: string;
}

export interface SetEstimateResult {
    success: boolean;
    error?: any;
    message?: string;
}

/**
 * Validates that a ticket exists and belongs to the specified room
 */
export const validateTicketAndRoom = async (
    ticketId: number,
    roomName: string
): Promise<ShowVotesResult> => {
    try {
        // Get ticket data
        const { data: currentTicketData, error: currentTicketError } =
            await findTicketById(ticketId);
        if (currentTicketError) {
            return {
                success: false,
                error: currentTicketError,
                message: 'Error getting ticket',
            };
        }
        if (!currentTicketData || currentTicketData.length === 0) {
            return { success: false, error: null, message: 'Ticket not found' };
        }

        // Verify ticket belongs to the specified room
        const { data: getTicketData, error: getTicketError } =
            await findRoomByIdAndName(currentTicketData[0].room_id, roomName);
        if (getTicketError) {
            return {
                success: false,
                error: getTicketError,
                message: 'Error getting ticket',
            };
        }
        if (!getTicketData || getTicketData.length === 0) {
            return { success: false, error: null, message: 'Ticket not found' };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error,
            message: 'Unexpected error during ticket validation',
        };
    }
};

/**
 * Handles setting the estimate for a ticket
 */
export const handleSetEstimate = async (
    roomName: string,
    ticketId: number,
    chosenEstimate: number,
    averageVote: number,
    standardDeviation: number
): Promise<SetEstimateResult> => {
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
            return {
                success: false,
                error: roomError,
                message: 'Could not find room',
            };
        }

        // Update ticket with estimate
        const { error: updateTicketError } = await updateTicketEstimate(
            ticketId,
            chosenEstimate,
            averageVote,
            standardDeviation
        );
        if (updateTicketError) {
            return {
                success: false,
                error: updateTicketError,
                message: 'Error updating ticket',
            };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error,
            message: 'Unexpected error during estimate setting',
        };
    }
};
