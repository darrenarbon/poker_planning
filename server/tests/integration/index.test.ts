import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { supabaseConnection } from '../../src/database';
import router from '../../src/routes/index';
import { getUserDetails } from '../../src/routes/routeHelper';

// Mock dependencies
vi.mock('../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(),
    },
}));

vi.mock('../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
    returnError: vi.fn((res, status, error, message) => {
        return res.status(status).json({ error: message });
    }),
}));

// Mock Auth0 service to avoid JWT validation issues
vi.mock('../../src/services/authService', () => ({
    checkJwt: (req: any, res: any, next: any) => {
        // Mock successful authentication
        req.auth = {
            payload: {
                sub: 'auth0|test123',
                email: 'test@example.com',
            },
        };
        next();
    },
    handleUserLogin: vi.fn(),
    validateUserData: vi.fn(),
}));

// Mock other Auth0 related modules
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() => (req: any, res: any, next: any) => {
        req.auth = {
            payload: {
                sub: 'auth0|test123',
                email: 'test@example.com',
            },
        };
        next();
    }),
}));

describe('API Routes Integration Tests', () => {
    let app: express.Application;
    const mockSupabase = supabaseConnection as any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create Express app with routes
        app = express();
        app.use(express.json());
        app.use('/api', router);

        // Reset mocks
        mockSupabase.from = vi.fn();
        (getUserDetails as Mock).mockReset();
    });

    describe('Health Check Endpoint', () => {
        it('should return 200 and service status for GET /api/health', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'OK',
                timestamp: expect.any(String),
                service: 'Poker Planning API',
            });

            // Verify timestamp is a valid ISO string
            expect(new Date(response.body.timestamp).toISOString()).toBe(
                response.body.timestamp
            );
        });
    });

    describe('API Documentation Endpoint', () => {
        it('should return API documentation for GET /api/', async () => {
            const response = await request(app).get('/api/');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                message: 'Poker Planning API',
                version: '1.0.0',
                endpoints: {
                    auth: '/auth',
                    users: '/users',
                    rooms: '/rooms',
                    tickets: '/tickets',
                    jiraTickets: '/jira-tickets',
                    health: '/health',
                },
                documentation: 'Visit /health for service status',
            });
        });
    });

    // describe('Route Mounting', () => {
    //     it('should route auth requests to auth router', async () => {
    //         // Mock user creation for login
    //         (getUserDetails as Mock).mockResolvedValue(null);

    //         const mockInsertChain = vi.fn().mockResolvedValue({
    //             data: [{ user_id: 1, email: 'test@example.com' }],
    //             error: null,
    //         });

    //         mockSupabase.from.mockReturnValue({
    //             insert: vi.fn().mockReturnValue({
    //                 select: mockInsertChain,
    //             }),
    //         });

    //         const response = await request(app)
    //             .post('/api/auth/login')
    //             .send({
    //                 user: {
    //                     sub: 'auth0|test123',
    //                     email: 'test@example.com',
    //                 },
    //             });

    //         // Should reach auth router (even if it fails due to mocking)
    //         expect(response.status).toBe(200);
    //     });

    //     it('should route user requests to user router', async () => {
    //         // Mock user rooms query
    //         const mockEqChain = vi.fn().mockResolvedValue({
    //             data: [{ room_id: 1, room_name: 'test-room' }],
    //             error: null,
    //         });

    //         const mockSelectChain = vi.fn().mockReturnValue({
    //             eq: mockEqChain,
    //         });

    //         mockSupabase.from
    //             .mockReturnValueOnce({
    //                 select: mockSelectChain,
    //             })
    //             .mockReturnValueOnce({
    //                 select: vi.fn().mockReturnValue({
    //                     in: vi.fn().mockResolvedValue({
    //                         data: [{ user_id: 1, room_id: 1 }],
    //                         error: null,
    //                     }),
    //                 }),
    //             });

    //         const response = await request(app).get(
    //             '/api/users/auth0|test123/rooms'
    //         );

    //         // Should reach user router
    //         expect(response.status).toBe(200);
    //     });

    //     it('should route room requests to room router', async () => {
    //         // Mock getUserDetails for room creation
    //         (getUserDetails as Mock).mockResolvedValue({
    //             user_id: 1,
    //             auth0_sub: 'auth0|test123',
    //         });

    //         // Mock room creation
    //         const mockSelectChain = vi.fn().mockResolvedValue({
    //             data: [{ room_id: 1, room_name: 'test-room' }],
    //             error: null,
    //         });

    //         const mockInsertChainRoom = vi.fn().mockReturnValue({
    //             select: mockSelectChain,
    //         });

    //         const mockInsertChainUser = vi.fn().mockResolvedValue({
    //             error: null,
    //         });

    //         mockSupabase.from
    //             .mockReturnValueOnce({
    //                 insert: mockInsertChainRoom,
    //             })
    //             .mockReturnValueOnce({
    //                 insert: mockInsertChainUser,
    //             });

    //         const response = await request(app).post('/api/rooms').send({
    //             roomName: 'Test Room',
    //             baseUrl: 'https://example.com',
    //         });

    //         // Should reach room router
    //         expect(response.status).toBe(200);
    //     });

    //     it('should route ticket requests to ticket router', async () => {
    //         // Mock ticket deletion
    //         const mockEqChain = vi.fn().mockResolvedValue({
    //             data: [{ ticket_id: '1', room_id: 1 }],
    //             error: null,
    //         });

    //         const mockSelectChain = vi.fn().mockReturnValue({
    //             eq: mockEqChain,
    //         });

    //         const mockDeleteChain = vi.fn().mockResolvedValue({
    //             error: null,
    //         });

    //         mockSupabase.from
    //             .mockReturnValueOnce({
    //                 select: mockSelectChain,
    //             })
    //             .mockReturnValueOnce({
    //                 delete: vi.fn().mockReturnValue({
    //                     eq: mockDeleteChain,
    //                 }),
    //             });

    //         const response = await request(app).delete('/api/tickets/1');

    //         // Should reach ticket router
    //         expect(response.status).toBe(200);
    //     });

    //     it('should route jira-ticket requests to jira-ticket router', async () => {
    //         // Mock environment variables for JIRA
    //         vi.stubEnv('ATLASSIAN_DOMAIN', 'test-domain');
    //         vi.stubEnv('ATLASSIAN_EMAIL', 'test@example.com');
    //         vi.stubEnv('ATLASSIAN_API_KEY', 'test-api-key');

    //         // Mock fetch for JIRA API
    //         const mockJiraResponse = {
    //             ok: true,
    //             json: vi.fn().mockResolvedValue({
    //                 key: 'TEST-123',
    //                 fields: {
    //                     summary: 'Test ticket',
    //                     description: 'Test description',
    //                 },
    //             }),
    //         };

    //         global.fetch = vi.fn().mockResolvedValue(mockJiraResponse);

    //         const response = await request(app).get(
    //             '/api/jira-tickets/TEST-123'
    //         );

    //         // Should reach jira-ticket router
    //         expect(response.status).toBe(200);
    //     });
    // });

    describe('404 Handler', () => {
        it('should return 404 for unmatched GET routes', async () => {
            const response = await request(app).get('/api/nonexistent-route');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not Found',
                message: 'Route /api/nonexistent-route not found',
            });
        });

        it('should return 404 for unmatched POST routes', async () => {
            const response = await request(app).post('/api/invalid-endpoint');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not Found',
                message: 'Route /api/invalid-endpoint not found',
            });
        });

        it('should return 404 for deeply nested unmatched routes', async () => {
            const response = await request(app).get(
                '/api/some/deeply/nested/invalid/path'
            );

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not Found',
                message: 'Route /api/some/deeply/nested/invalid/path not found',
            });
        });
    });

    describe('Route Ordering', () => {
        it('should prioritize specific routes over catch-all 404', async () => {
            // Health endpoint should work (not caught by 404)
            const healthResponse = await request(app).get('/api/health');
            expect(healthResponse.status).toBe(200);

            // Root endpoint should work (not caught by 404)
            const rootResponse = await request(app).get('/api/');
            expect(rootResponse.status).toBe(200);

            // Invalid route should be caught by 404
            const invalidResponse = await request(app).get(
                '/api/definitely-invalid'
            );
            expect(invalidResponse.status).toBe(404);
        });
    });

    describe('Content Type Handling', () => {
        it('should handle JSON requests properly', async () => {
            const response = await request(app)
                .get('/api/health')
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/json/);
        });

        it('should return JSON for 404 responses', async () => {
            const response = await request(app)
                .get('/api/invalid')
                .set('Accept', 'application/json');

            expect(response.status).toBe(404);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(response.body).toBeInstanceOf(Object);
        });
    });

    describe('Error Handling', () => {
        it('should handle Express app errors gracefully', async () => {
            // Test with malformed JSON (if middleware handles it)
            const response = await request(app)
                .post('/api/rooms')
                .set('Content-Type', 'application/json')
                .send('invalid-json-data');

            // Should return some error status (400, 500, etc.)
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });
});
