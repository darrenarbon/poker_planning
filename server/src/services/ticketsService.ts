import { supabaseConnection } from '../database';
import { TicketDeleteResult, TicketLookupResult } from '../types/tickets';

/**
 * Finds a ticket by ID
 * @param ticketId - The ticket ID to search for
 * @returns Promise with ticket lookup result
 */
export const findTicketById = async (
    ticketId: string
): Promise<TicketLookupResult> => {
    try {
        // Validate input
        if (!ticketId) {
            return {
                success: false,
                error: 'Missing ticket ID',
                message: 'Ticket ID is required',
                status: 400,
            };
        }

        const { data, error: findTicketError } = await supabaseConnection
            .from('ticket')
            .select()
            .eq('ticket_id', ticketId);

        if (findTicketError) {
            return {
                success: false,
                error: findTicketError,
                message: 'Error fetching ticket',
                status: 500,
            };
        }

        if (!data || data.length === 0) {
            return {
                success: false,
                error: 'Ticket not found',
                message: 'Ticket not found',
                status: 404,
            };
        }

        return {
            success: true,
            data: data[0],
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error while finding ticket',
            status: 500,
        };
    }
};

/**
 * Deletes a ticket by ID
 * @param ticketId - The ticket ID to delete
 * @returns Promise with ticket deletion result
 */
export const deleteTicketById = async (
    ticketId: string
): Promise<TicketDeleteResult> => {
    try {
        // First, find the ticket to ensure it exists
        const lookupResult = await findTicketById(ticketId);

        if (!lookupResult.success) {
            return {
                success: false,
                error: lookupResult.error,
                message: lookupResult.message,
                status: lookupResult.status,
            };
        }

        // Delete the ticket
        const { error: deleteTicketError } = await supabaseConnection
            .from('ticket')
            .delete()
            .eq('ticket_id', ticketId);

        if (deleteTicketError) {
            return {
                success: false,
                error: deleteTicketError,
                message: 'Error deleting ticket',
                status: 500,
            };
        }

        return {
            success: true,
            data: {
                message: 'Ticket deleted',
                deletedTicket: lookupResult.data,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error while deleting ticket',
            status: 500,
        };
    }
};
