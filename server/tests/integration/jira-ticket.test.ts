import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { json } from 'express';

// Mock the Auth0 JWT middleware before importing anything else
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

// Mock the database connection
vi.mock('../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            insert: vi.fn(),
            select: vi.fn(),
            eq: vi.fn(),
        })),
    },
}));

// Mock the JIRA ticket service
vi.mock('../../src/services/jira-ticketService', () => ({
    fetchJiraTicket: vi.fn(),
}));

// Mock the route helper functions
vi.mock('../../src/routes/routeHelper', () => ({
    returnError: vi.fn(),
}));

import jiraTicketRouter from '../../src/routes/jira-ticket';
import { fetchJiraTicket } from '../../src/services/jira-ticketService';
import { returnError } from '../../src/routes/routeHelper';

const app = express();
app.use(json());
app.use('/jiraticket', jiraTicketRouter);

describe('JIRA Ticket Routes Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations
        (fetchJiraTicket as Mock).mockReset();
        (returnError as Mock).mockReset();
    });

    describe('GET /jiraticket/:ticketId', () => {
        const mockTicketData = {
            id: 'TICKET-123',
            key: 'TICKET-123',
            fields: {
                summary: 'Test ticket summary',
                description: 'Test ticket description',
                creator: {
                    displayName: 'John Doe',
                    emailAddress: 'john@example.com',
                },
                priority: {
                    name: 'High',
                    id: '2',
                },
            },
            renderedFields: {
                description: '<p>Test ticket description</p>',
            },
        };

        it('should return 200 and ticket data for valid ticket ID', async () => {
            // Mock successful service response
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: true,
                data: mockTicketData,
            });

            const response = await request(app)
                .get('/jiraticket/TICKET-123')
                .expect(200);

            expect(response.body).toEqual(mockTicketData);
            expect(fetchJiraTicket).toHaveBeenCalledWith('TICKET-123');
        });

        it('should handle missing ticket ID parameter', async () => {
            // Mock returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            // This test might be tricky since Express will still pass an empty string
            // Let's test with an empty string as the ticket ID
            const response = await request(app).get('/jiraticket/').expect(404); // Express returns 404 for missing route parameters

            // Since the route won't match, fetchJiraTicket won't be called
            expect(fetchJiraTicket).not.toHaveBeenCalled();
        });

        it('should handle service errors with custom status and message', async () => {
            // Mock service error response
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: false,
                error: { message: 'Ticket not found' },
                message: 'Error fetching JIRA ticket',
                status: 404,
            });

            // Mock returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/jiraticket/NONEXISTENT-123')
                .expect(404);

            expect(fetchJiraTicket).toHaveBeenCalledWith('NONEXISTENT-123');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                { message: 'Ticket not found' },
                'Error fetching JIRA ticket'
            );
        });

        it('should handle service errors without custom status (defaults to 500)', async () => {
            // Mock service error response without status
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: false,
                error: { message: 'JIRA API configuration is incomplete' },
                message: 'JIRA API configuration is incomplete',
            });

            // Mock returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/jiraticket/TEST-456')
                .expect(500);

            expect(fetchJiraTicket).toHaveBeenCalledWith('TEST-456');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                { message: 'JIRA API configuration is incomplete' },
                'JIRA API configuration is incomplete'
            );
        });

        it('should handle service errors without custom message', async () => {
            // Mock service error response without message
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: false,
                error: { message: 'API error' },
                status: 403,
            });

            // Mock returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/jiraticket/FORBIDDEN-789')
                .expect(403);

            expect(fetchJiraTicket).toHaveBeenCalledWith('FORBIDDEN-789');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                403,
                { message: 'API error' },
                'Error fetching JIRA ticket'
            );
        });

        it('should handle unexpected errors in route handler', async () => {
            // Mock service throwing an unexpected error
            (fetchJiraTicket as Mock).mockRejectedValue(
                new Error('Unexpected service error')
            );

            // Mock returnError function
            (returnError as Mock).mockImplementation(
                (
                    res: any,
                    code: any,
                    error: any,
                    message: any,
                    logPrefix: any
                ) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/jiraticket/ERROR-TEST')
                .expect(500);

            expect(fetchJiraTicket).toHaveBeenCalledWith('ERROR-TEST');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.any(Error),
                'Internal server error',
                'Unhandled error in JIRA ticket route:'
            );
        });

        it('should handle ticket IDs with special characters', async () => {
            // Mock successful service response
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: true,
                data: {
                    ...mockTicketData,
                    id: 'PROJECT-SPECIAL-123',
                    key: 'PROJECT-SPECIAL-123',
                },
            });

            const response = await request(app)
                .get('/jiraticket/PROJECT-SPECIAL-123')
                .expect(200);

            expect(fetchJiraTicket).toHaveBeenCalledWith('PROJECT-SPECIAL-123');
            expect(response.body.id).toBe('PROJECT-SPECIAL-123');
        });

        it('should handle numeric ticket IDs', async () => {
            // Mock successful service response
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: true,
                data: {
                    ...mockTicketData,
                    id: '12345',
                    key: '12345',
                },
            });

            const response = await request(app)
                .get('/jiraticket/12345')
                .expect(200);

            expect(fetchJiraTicket).toHaveBeenCalledWith('12345');
            expect(response.body.id).toBe('12345');
        });

        it('should preserve all ticket data fields in response', async () => {
            const complexTicketData = {
                id: 'COMPLEX-456',
                key: 'COMPLEX-456',
                fields: {
                    summary: 'Complex ticket with all fields',
                    description: {
                        type: 'doc',
                        content: [
                            {
                                type: 'paragraph',
                                content: [
                                    { type: 'text', text: 'Description' },
                                ],
                            },
                        ],
                    },
                    creator: {
                        displayName: 'Jane Smith',
                        emailAddress: 'jane@example.com',
                    },
                    parent: {
                        key: 'PARENT-123',
                        fields: {
                            summary: 'Parent ticket summary',
                        },
                    },
                    priority: {
                        name: 'Critical',
                        id: '1',
                    },
                },
                renderedFields: {
                    description: '<p>Rendered description</p>',
                },
            };

            // Mock successful service response with complex data
            (fetchJiraTicket as Mock).mockResolvedValue({
                success: true,
                data: complexTicketData,
            });

            const response = await request(app)
                .get('/jiraticket/COMPLEX-456')
                .expect(200);

            expect(response.body).toEqual(complexTicketData);
            expect(response.body.fields.parent).toBeDefined();
            expect(response.body.renderedFields).toBeDefined();
        });
    });
});
