import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock the database connection before importing the service
vi.mock('../../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            select: vi.fn(),
            eq: vi.fn(),
            delete: vi.fn(),
        })),
    },
}));

import {
    findTicketById,
    deleteTicketById,
} from '../../../src/services/ticketsService';
import { supabaseConnection } from '../../../src/database';

describe('ticketsService', () => {
    let mockSelect: Mock;
    let mockEq: Mock;
    let mockDelete: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup chainable database mocks
        mockSelect = vi.fn().mockReturnThis();
        mockEq = vi.fn().mockReturnThis();
        mockDelete = vi.fn().mockReturnThis();

        (supabaseConnection.from as Mock).mockReturnValue({
            select: mockSelect,
            eq: mockEq,
            delete: mockDelete,
        });
    });

    describe('findTicketById', () => {
        it('should find a ticket successfully', async () => {
            const ticketData = {
                ticket_id: 'TICKET-123',
                room_id: 1,
                ticket_number: 'TICKET-123',
                created_at: '2023-01-01T00:00:00Z',
            };

            // Mock successful ticket lookup
            mockEq.mockResolvedValue({
                data: [ticketData],
                error: null,
            });

            const result = await findTicketById('TICKET-123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(ticketData);
            expect(supabaseConnection.from).toHaveBeenCalledWith('ticket');
            expect(mockSelect).toHaveBeenCalled();
            expect(mockEq).toHaveBeenCalledWith('ticket_id', 'TICKET-123');
        });

        it('should handle missing ticket ID', async () => {
            const result = await findTicketById('');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing ticket ID');
            expect(result.message).toBe('Ticket ID is required');
            expect(result.status).toBe(400);
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should handle ticket not found', async () => {
            // Mock no ticket found
            mockEq.mockResolvedValue({
                data: [],
                error: null,
            });

            const result = await findTicketById('NONEXISTENT-123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Ticket not found');
            expect(result.message).toBe('Ticket not found');
            expect(result.status).toBe(404);
            expect(supabaseConnection.from).toHaveBeenCalledWith('ticket');
        });

        it('should handle null data response', async () => {
            // Mock null data response
            mockEq.mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await findTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Ticket not found');
            expect(result.message).toBe('Ticket not found');
            expect(result.status).toBe(404);
        });

        it('should handle database error during ticket lookup', async () => {
            const dbError = { message: 'Database connection error' };

            // Mock database error
            mockEq.mockResolvedValue({
                data: null,
                error: dbError,
            });

            const result = await findTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toEqual(dbError);
            expect(result.message).toBe('Error fetching ticket');
            expect(result.status).toBe(500);
        });

        it('should handle unexpected errors', async () => {
            const unexpectedError = new Error('Unexpected error');

            // Mock unexpected error by making the database call throw
            mockEq.mockRejectedValue(unexpectedError);

            const result = await findTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toEqual(unexpectedError);
            expect(result.message).toBe(
                'Internal server error while finding ticket'
            );
            expect(result.status).toBe(500);
        });
    });

    describe('deleteTicketById', () => {
        it('should delete a ticket successfully', async () => {
            const ticketData = {
                ticket_id: 'TICKET-123',
                room_id: 1,
                ticket_number: 'TICKET-123',
                created_at: '2023-01-01T00:00:00Z',
            };

            // Mock successful ticket lookup (first call)
            mockEq
                .mockResolvedValueOnce({
                    data: [ticketData],
                    error: null,
                })
                .mockResolvedValueOnce({
                    error: null,
                });

            const result = await deleteTicketById('TICKET-123');

            expect(result.success).toBe(true);
            expect(result.data?.message).toBe('Ticket deleted');
            expect(result.data?.deletedTicket).toEqual(ticketData);

            // Should be called twice - once for select, once for delete
            expect(supabaseConnection.from).toHaveBeenCalledTimes(2);
            expect(supabaseConnection.from).toHaveBeenCalledWith('ticket');
        });

        it('should handle ticket not found during deletion', async () => {
            // Mock ticket not found
            mockEq.mockResolvedValue({
                data: [],
                error: null,
            });

            const result = await deleteTicketById('NONEXISTENT-123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Ticket not found');
            expect(result.message).toBe('Ticket not found');
            expect(result.status).toBe(404);

            // Should only be called once for the lookup
            expect(supabaseConnection.from).toHaveBeenCalledTimes(1);
        });

        it('should handle database error during ticket lookup', async () => {
            const dbError = { message: 'Database connection error' };

            // Mock database error during lookup
            mockEq.mockResolvedValue({
                data: null,
                error: dbError,
            });

            const result = await deleteTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toEqual(dbError);
            expect(result.message).toBe('Error fetching ticket');
            expect(result.status).toBe(500);
        });

        it('should handle database error during ticket deletion', async () => {
            const ticketData = {
                ticket_id: 'TICKET-123',
                room_id: 1,
                ticket_number: 'TICKET-123',
                created_at: '2023-01-01T00:00:00Z',
            };

            const deleteError = { message: 'Failed to delete' };

            // Mock successful lookup but failed deletion
            mockEq
                .mockResolvedValueOnce({
                    data: [ticketData],
                    error: null,
                })
                .mockResolvedValueOnce({
                    error: deleteError,
                });

            const result = await deleteTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toEqual(deleteError);
            expect(result.message).toBe('Error deleting ticket');
            expect(result.status).toBe(500);
        });

        it('should handle missing ticket ID', async () => {
            const result = await deleteTicketById('');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Missing ticket ID');
            expect(result.message).toBe('Ticket ID is required');
            expect(result.status).toBe(400);
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should handle unexpected errors during deletion', async () => {
            const unexpectedError = new Error('Unexpected error');

            // Mock unexpected error by making the first database call throw
            mockEq.mockRejectedValue(unexpectedError);

            const result = await deleteTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toEqual(unexpectedError);
            expect(result.message).toBe(
                'Internal server error while finding ticket'
            );
            expect(result.status).toBe(500);
        });

        it('should handle unexpected errors after successful lookup', async () => {
            const ticketData = {
                ticket_id: 'TICKET-123',
                room_id: 1,
                ticket_number: 'TICKET-123',
                created_at: '2023-01-01T00:00:00Z',
            };

            const unexpectedError = new Error('Deletion failed unexpectedly');

            // Mock successful lookup but unexpected error during deletion
            mockEq
                .mockResolvedValueOnce({
                    data: [ticketData],
                    error: null,
                })
                .mockRejectedValueOnce(unexpectedError);

            const result = await deleteTicketById('TICKET-123');

            expect(result.success).toBe(false);
            expect(result.error).toEqual(unexpectedError);
            expect(result.message).toBe(
                'Internal server error while deleting ticket'
            );
            expect(result.status).toBe(500);
        });
    });
});
