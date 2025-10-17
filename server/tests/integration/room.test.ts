import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { json } from 'express';

// Mock the Auth0 JWT middleware before importing anything else
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() =>
        vi.fn((req: any, res: any, next: any) => {
            // Mock successful authentication with payload
            req.auth = {
                payload: {
                    sub: 'auth0|test123',
                },
            };
            next();
        })
    ),
}));

// Mock the checkJwt directly from authService
vi.mock('../../src/services/authService', () => ({
    checkJwt: vi.fn((req: any, res: any, next: any) => {
        // Mock successful authentication with payload
        req.auth = {
            payload: {
                sub: 'auth0|test123',
            },
        };
        next();
    }),
}));

// Mock the database connection
vi.mock('../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            insert: vi.fn(),
            select: vi.fn(),
            eq: vi.fn(),
            in: vi.fn(),
            order: vi.fn(),
        })),
    },
}));

// Mock the route helper functions
vi.mock('../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
    returnError: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'mocked-uuid-1234567890'),
}));

import roomRouter from '../../src/routes/room';
import { supabaseConnection } from '../../src/database';
import { getUserDetails, returnError } from '../../src/routes/routeHelper';
import { checkJwt } from '../../src/services/authService';

const app = express();
app.use(json());
app.use('/room', roomRouter);

describe('Room Routes', () => {
    let mockSelect: Mock;
    let mockInsert: Mock;
    let mockEq: Mock;
    let mockIn: Mock;
    let mockOrder: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations
        (getUserDetails as Mock).mockReset();
        (returnError as Mock).mockReset();

        // Reset auth middleware to default successful behavior
        (checkJwt as Mock).mockImplementation(
            (req: any, res: any, next: any) => {
                req.auth = {
                    payload: {
                        sub: 'auth0|test123',
                    },
                };
                next();
            }
        );

        // Setup chainable database mocks
        mockSelect = vi.fn().mockReturnThis();
        mockInsert = vi.fn().mockReturnThis();
        mockEq = vi.fn().mockReturnThis();
        mockIn = vi.fn().mockReturnThis();
        mockOrder = vi.fn().mockReturnThis();

        (supabaseConnection.from as Mock).mockReturnValue({
            select: mockSelect,
            insert: mockInsert,
            eq: mockEq,
            in: mockIn,
            order: mockOrder,
        });
    });

    describe('POST /room', () => {
        const validRoomData = {
            roomName: 'Test Room',
            baseUrl: 'https://example.atlassian.net',
        };

        it('should create a new room successfully', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

            // Create chainable mocks for room creation
            const mockSelectChainRoom = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'mocked-uu',
                        admin_id: 1,
                        friendly_name: 'Test Room',
                        ticket_base_url: 'https://example.atlassian.net',
                    },
                ],
                error: null,
            });

            const mockInsertChainRoom = vi.fn().mockReturnValue({
                select: mockSelectChainRoom,
            });

            // Mock user addition to room
            const mockInsertChainUser = vi.fn().mockResolvedValue({
                error: null,
            });

            // Setup the mock chain
            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    insert: mockInsertChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChainUser,
                });

            const response = await request(app)
                .post('/room')
                .send(validRoomData)
                .expect(200);

            expect(response.body).toEqual({
                roomId: 'mocked-uui',
            });
            expect(getUserDetails).toHaveBeenCalledWith('auth0|test123');
        });

        // Note: Auth middleware testing skipped in integration tests
        // as it requires complex Auth0 middleware mocking

        it('should handle user not found in database', async () => {
            // Mock user not found
            (getUserDetails as Mock).mockResolvedValue(null);

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room')
                .send(validRoomData)
                .expect(404);

            expect(getUserDetails).toHaveBeenCalledWith('auth0|test123');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                'User not found',
                'User not found in database'
            );
        });

        it('should handle database error during room creation', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

            // Create chainable mock that fails at .select()
            const mockSelectChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            const mockInsertChain = vi.fn().mockReturnValue({
                select: mockSelectChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsertChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room')
                .send(validRoomData)
                .expect(500);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                { message: 'Database error' },
                'Error creating room'
            );
        });

        it('should handle missing room name', async () => {
            const invalidData = {
                baseUrl: 'https://example.atlassian.net',
            };

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room')
                .send(invalidData)
                .expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                'Missing required parameters',
                'Room name and user authentication are required'
            );
        });

        it('should handle missing authentication payload', async () => {
            // Temporarily override the middleware mock to simulate missing auth
            (checkJwt as Mock).mockImplementation(
                (req: any, res: any, next: any) => {
                    // Don't set req.auth to simulate missing authentication
                    next();
                }
            );

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room')
                .send(validRoomData)
                .expect(401);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                401,
                null,
                'Unauthorized: Missing authentication payload'
            );
        });

        it('should handle missing auth payload sub', async () => {
            // Temporarily override the middleware mock to provide auth object without sub
            (checkJwt as Mock).mockImplementation(
                (req: any, res: any, next: any) => {
                    // Mock auth object without sub
                    req.auth = {
                        payload: {
                            // Missing sub field
                            email: 'test@example.com',
                        },
                    };
                    next();
                }
            );

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room')
                .send(validRoomData)
                .expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                null,
                'Invalid authentication payload: missing sub'
            );
        });

        it('should handle service failure with custom status code', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

            // Instead of mocking the service, let's mock the database to return a specific error
            // that the service will convert to a specific status code
            const mockSelectChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Room name already exists', code: '23505' }, // Unique constraint violation
            });

            const mockInsertChain = vi.fn().mockReturnValue({
                select: mockSelectChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsertChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room')
                .send(validRoomData)
                .expect(500);

            // The actual status code may be 500, but we're testing the branch logic
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.objectContaining({
                    message: 'Room name already exists',
                }),
                'Error creating room'
            );
        });
    });

    describe('POST /room/:roomId/tickets', () => {
        const validTicketsData = {
            ticketsToSave: ['TICKET-1', 'TICKET-2', 'TICKET-3'],
        };

        it('should add tickets to room successfully', async () => {
            // Create chainable mock objects
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: '1',
                        room_name: 'test-room',
                    },
                ],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            const mockInsertChain = vi.fn().mockResolvedValue({
                error: null,
            });

            // Setup the mock chain for room lookup
            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    select: mockSelectChain,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChain,
                });

            const response = await request(app)
                .post('/room/1/tickets')
                .send(validTicketsData)
                .expect(200);

            expect(response.body).toEqual({
                message: 'Tickets added',
            });
            expect(mockInsertChain).toHaveBeenCalledWith([
                { room_id: '1', ticket_number: 'TICKET-1' },
                { room_id: '1', ticket_number: 'TICKET-2' },
                { room_id: '1', ticket_number: 'TICKET-3' },
            ]);
        });

        it('should handle room not found', async () => {
            // Create chainable mock for room not found
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/nonexistent-room/tickets')
                .send(validTicketsData)
                .expect(404);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                'Room not found',
                'Room not found'
            );
        });

        it('should handle invalid tickets array', async () => {
            const invalidData = {
                ticketsToSave: 'not-an-array',
            };

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/test-room/tickets')
                .send(invalidData)
                .expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                'Invalid parameters',
                'Room ID and tickets array are required'
            );
        });

        it('should handle service failure with custom status code', async () => {
            // This test will focus on testing the `result.status || 500` branch logic
            // by causing a service failure that includes different error patterns

            const mockEqChain = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/tickets')
                .send(validTicketsData)
                .expect(404);

            // This tests the `result.status || 500` logic when status is provided
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                'Room not found',
                'Room not found'
            );
        });

        it('should handle service failure without status (defaulting to 500)', async () => {
            // Test the || 500 fallback by causing a database error that doesn't include a status
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection timeout' }, // Error without status
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/tickets')
                .send(validTicketsData)
                .expect(500);

            // This tests the fallback to 500 when no status is provided
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.objectContaining({ message: 'Connection timeout' }),
                'Error fetching room'
            );
        });
    });

    // check this test is correct as roomName changed to roomId
    describe('POST /room/:roomId/newTicket', () => {
        const validTicketData = {
            ticketNumber: 'TICKET-123',
        };

        it('should add single ticket to room successfully', async () => {
            // Create chainable mocks for room lookup
            const mockEqChainRoom = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: '1',
                        room_name: 'test-room',
                    },
                ],
                error: null,
            });

            const mockSelectChainRoom = vi.fn().mockReturnValue({
                eq: mockEqChainRoom,
            });

            // Create chainable mocks for ticket insertion with select
            const mockSelectChainInsert = vi.fn().mockResolvedValue({
                data: [
                    {
                        ticket_id: 1,
                        room_id: 1,
                        ticket_number: 'TICKET-123',
                    },
                ],
                error: null,
            });

            const mockInsertChain = vi.fn().mockReturnValue({
                select: mockSelectChainInsert,
            });

            // Setup the mock chain
            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    select: mockSelectChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChain,
                });

            const response = await request(app)
                .post('/room/1/ticket')
                .send(validTicketData)
                .expect(200);

            expect(response.body).toEqual({
                ticket_id: 1,
                room_id: 1,
                ticket_number: 'TICKET-123',
            });
        });

        it('should handle missing ticket number', async () => {
            const invalidData = {};

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/ticket')
                .send(invalidData)
                .expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                'Missing parameters',
                'Room ID and ticket number are required'
            );
        });

        it('should handle single ticket service failure with custom status', async () => {
            // Test the branch where service provides specific status code
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/ticket')
                .send(validTicketData)
                .expect(404);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                'Room not found',
                'Room not found'
            );
        });

        it('should handle single ticket service failure without status', async () => {
            // Test the || 500 fallback logic
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/ticket')
                .send(validTicketData)
                .expect(500);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.objectContaining({
                    message: 'Database connection failed',
                }),
                'Error fetching room'
            );
        });
    });

    // check this test is correct as roomName changed to roomId
    describe('GET /room/:roomId', () => {
        it('should get room details successfully', async () => {
            // Create separate chainable mocks for each database call

            // 1. Room data query
            const mockEqRoom = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-room',
                        friendly_name: 'Test Room',
                        admin_id: 1,
                        auth0_sub: 'auth0|admin123',
                        created_at: '2023-01-01T00:00:00Z',
                        ticket_base_url: 'https://example.atlassian.net',
                    },
                ],
                error: null,
            });
            const mockSelectRoom = vi.fn().mockReturnValue({ eq: mockEqRoom });

            // 2. Users in room query
            const mockEqUsers = vi.fn().mockResolvedValue({
                data: [{ user_id: 1 }, { user_id: 2 }],
                error: null,
            });
            const mockSelectUsers = vi
                .fn()
                .mockReturnValue({ eq: mockEqUsers });

            // 3. User details query
            const mockInUserDetails = vi.fn().mockResolvedValue({
                data: [
                    { user_id: 1, email: 'user1@example.com' },
                    { user_id: 2, email: 'user2@example.com' },
                ],
                error: null,
            });
            const mockSelectUserDetails = vi
                .fn()
                .mockReturnValue({ in: mockInUserDetails });

            // 4. Tickets query
            const mockEqTickets = vi.fn().mockResolvedValue({
                data: [
                    { ticket_id: 1, ticket_number: 'TICKET-1', room_id: 1 },
                    { ticket_id: 2, ticket_number: 'TICKET-2', room_id: 1 },
                ],
                error: null,
            });
            const mockOrderTickets = vi
                .fn()
                .mockReturnValue({ eq: mockEqTickets });
            const mockSelectTickets = vi
                .fn()
                .mockReturnValue({ order: mockOrderTickets });

            // 5. Votes queries (called twice, once for each ticket)
            const mockEqVotes = vi.fn().mockResolvedValue({
                data: [
                    { vote: 5, usersub: 'auth0|user1' },
                    { vote: 8, usersub: 'auth0|user2' },
                ],
                error: null,
            });
            const mockSelectVotes = vi
                .fn()
                .mockReturnValue({ eq: mockEqVotes });

            // Setup the mock chain for each database call in sequence
            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelectRoom }) // Room data
                .mockReturnValueOnce({ select: mockSelectUsers }) // Users in room
                .mockReturnValueOnce({ select: mockSelectUserDetails }) // User details
                .mockReturnValueOnce({ select: mockSelectTickets }) // Tickets
                .mockReturnValueOnce({ select: mockSelectVotes }) // Votes for ticket 1
                .mockReturnValueOnce({ select: mockSelectVotes }); // Votes for ticket 2

            const response = await request(app)
                .get('/room/test-room')
                .expect(200);

            expect(response.body).toHaveProperty('room');
            expect(response.body).toHaveProperty('users');
            expect(response.body).toHaveProperty('tickets');
            expect(response.body.room.roomName).toBe('test-room');
            expect(response.body.room.friendlyName).toBe('Test Room');
        });

        it('should handle room not found', async () => {
            // Create chainable mock for room not found
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/room/nonexistent-room')
                .expect(404);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                'Room not found',
                'Room not found'
            );
        });

        it('should handle database error during room fetch', async () => {
            // Create chainable mock for database error
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection error' },
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/room/test-room')
                .expect(500);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                { message: 'Database connection error' },
                'Error fetching room'
            );
        });

        it('should handle getRoomDetails service failure with custom status', async () => {
            // Test the branch where service provides specific status code
            // We'll use database error that gets translated to a specific status
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app).get('/room/1').expect(404);

            // This tests the specific status code from the service
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                'Room not found',
                'Room not found'
            );
        });

        it('should handle getRoomDetails service failure without status', async () => {
            // Test the || 500 fallback logic
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Network timeout' },
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app).get('/room/1').expect(500);

            // This tests the fallback to 500 when no specific status
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.objectContaining({ message: 'Network timeout' }),
                'Error fetching room'
            );
        });

        it('should handle unexpected errors in POST /rooms/:roomId/tickets', async () => {
            // Mock an unexpected error
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected database error');
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/tickets')
                .send({ ticketsToSave: ['TICKET-1'] })
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error during tickets addition',
            });
        });

        it('should handle unexpected errors in POST /rooms/:roomId/ticket', async () => {
            // Mock an unexpected error
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected database error');
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/room/1/ticket')
                .send({ ticketNumber: 'TICKET-1' })
                .expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error during ticket addition',
            });
        });

        it('should handle unexpected errors in GET /rooms/:roomId', async () => {
            // Mock an unexpected error
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected database error');
            });

            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app).get('/room/1').expect(500);

            expect(response.body).toEqual({
                error: 'Internal server error during room details fetch',
            });
        });
    });
});
