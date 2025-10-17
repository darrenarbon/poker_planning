/**
 * Ticket database record type
 */
export interface Ticket {
    ticket_id: number;
    room_id: number;
    ticket_number: string;
    created_at?: string;
}

/**
 * Service result types for ticket operations
 */
export interface TicketDeleteResult {
    success: boolean;
    data?: {
        message: string;
        deletedTicket?: Ticket;
    };
    error?: any;
    message?: string;
    status?: number;
}

/**
 * Service result for ticket lookup operations
 */
export interface TicketLookupResult {
    success: boolean;
    data?: Ticket;
    error?: any;
    message?: string;
    status?: number;
}
