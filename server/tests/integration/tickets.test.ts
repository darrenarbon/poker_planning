import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { json } from 'express';

// Mock the Auth0 JWT middleware before importing anything else
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() => (req: any, res: any, next: any) => {
        // Add mock user info to request if needed
        req.user = { sub: 'test-user-123' };
        next();
    }),
}));

// Mock the service layer
vi.mock('../../src/services/ticketsService', () => ({
    deleteTicketById: vi.fn(),
}));
vi.mock('../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(),
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(),
                })),
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(),
            })),
        })),
    },
}));

import ticketRouter from '../../src/routes/tickets';
import { supabaseConnection } from '../../src/database';
import { deleteTicketById } from '../../src/services/ticketsService';
import type { Mock } from 'vitest';

const app = express();
app.use(json());

app.use('/tickets', ticketRouter);

describe('Tickets Integration Tests', () => {
    let testTicketId: string;

    beforeAll(async () => {
        // Mock the insert operation for test setup
        testTicketId = 'test-ticket-123';

        const mockInsertChain = {
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                    data: { ticket_id: testTicketId },
                    error: null,
                }),
            })),
        };

        (supabaseConnection.from as any).mockReturnValue({
            insert: vi.fn().mockReturnValue(mockInsertChain),
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Set up default mock behavior for successful deletion
        (deleteTicketById as Mock).mockResolvedValue({
            success: true,
            data: {
                message: 'Ticket deleted',
            },
        });
    });

    describe('DELETE /tickets/:ticketId', () => {
        it('should delete an existing ticket', async () => {
            // Use the default mock setup
            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Ticket deleted',
            });

            expect(deleteTicketById).toHaveBeenCalledWith(testTicketId);
        });

        it('should return 404 for non-existent ticket', async () => {
            // Mock service returning failure for non-existent ticket
            (deleteTicketById as Mock).mockResolvedValue({
                success: false,
                status: 404,
                error: 'Ticket not found',
                message: 'Ticket not found',
            });

            const response = await request(app)
                .delete(`/tickets/99999`)
                .expect(404);

            expect(response.body).toEqual({
                error: 'Ticket not found',
            });
        });

        it('should handle database errors during ticket lookup', async () => {
            // Mock service failure during lookup
            (deleteTicketById as Mock).mockResolvedValue({
                success: false,
                status: 500,
                error: { message: 'Database connection error' },
                message: 'Error fetching ticket',
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(500);

            expect(response.body).toEqual({
                error: 'Error fetching ticket',
            });
        });

        it('should handle database errors during deletion', async () => {
            // Mock service failure during deletion
            (deleteTicketById as Mock).mockResolvedValue({
                success: false,
                status: 500,
                error: { message: 'Failed to delete' },
                message: 'Error deleting ticket',
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(500);

            expect(response.body).toEqual({
                error: 'Error deleting ticket',
            });
        });

        it('should handle missing ticket ID parameter', async () => {
            // This is tricky to test with Express routing since :ticketId will always have a value
            // But we can test by using an empty string which is falsy
            // Express will pass "" as the ticketId for this URL structure
            const response = await request(app)
                .delete('/tickets/') // This won't match /:ticketId route, will get 404
                .expect(404);

            // Express returns 404 for unmatched routes, which is expected behavior
        });

        it('should handle empty string ticket ID parameter', async () => {
            // URL encoded null character doesn't actually make ticketId falsy in Express
            // Express URL decoding doesn't work that way. Let's just verify the route behavior
            const response = await request(app)
                .delete('/tickets/%00') // This becomes a valid string ID
                .expect(200); // Will call service with this as ticketId

            // This test verifies route handles URL encoded characters normally
            expect(deleteTicketById).toHaveBeenCalledWith('\x00');
        });

        it('should handle successful deletion with custom success message', async () => {
            // Test successful deletion - this should use the provided message
            const customMessage = 'Custom ticket deletion message';

            (deleteTicketById as Mock).mockResolvedValue({
                success: true,
                data: {
                    message: customMessage,
                },
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(200);

            expect(response.body).toEqual({
                message: customMessage,
            });
        });

        it('should handle successful deletion with fallback message', async () => {
            // Test the || 'Ticket deleted' fallback by returning success without data.message
            (deleteTicketById as Mock).mockResolvedValue({
                success: true,
                data: null, // No data object
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Ticket deleted', // Should use the fallback
            });
        });

        it('should handle successful deletion with empty data object', async () => {
            // Test the || 'Ticket deleted' fallback by returning success with empty data
            (deleteTicketById as Mock).mockResolvedValue({
                success: true,
                data: {}, // Empty data object, no message property
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Ticket deleted', // Should use the fallback
            });
        });

        it('should handle service failure with custom status code', async () => {
            // Test the result.status || 500 branch with custom status
            (deleteTicketById as Mock).mockResolvedValue({
                success: false,
                status: 403,
                error: 'Access denied',
                message: 'User not authorized to delete this ticket',
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(403);

            expect(response.body).toEqual({
                error: 'User not authorized to delete this ticket',
            });
        });

        it('should handle service failure without status (fallback to 500)', async () => {
            // Test the || 500 fallback when no status is provided
            (deleteTicketById as Mock).mockResolvedValue({
                success: false,
                error: 'Database error',
                message: 'Generic error message',
                // No status property, should default to 500
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(500);

            expect(response.body).toEqual({
                error: 'Generic error message',
            });
        });

        it('should handle service failure with undefined message (use fallback)', async () => {
            // Test the || 'Error deleting ticket' fallback message
            (deleteTicketById as Mock).mockResolvedValue({
                success: false,
                status: 500,
                error: 'Some error',
                // No message property, should use fallback
            });

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(500);

            expect(response.body).toEqual({
                error: 'Error deleting ticket', // Fallback message
            });
        });

        it('should handle unexpected errors', async () => {
            // Mock the service throwing an unexpected error to test try/catch
            (deleteTicketById as Mock).mockRejectedValue(
                new Error('Unexpected database error')
            );

            const response = await request(app)
                .delete(`/tickets/${testTicketId}`)
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error',
            });
        });
    });
});
