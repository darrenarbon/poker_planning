import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    createRoom,
    addTicketsToRoom,
    addSingleTicketToRoom,
    getRoomDetails,
} from '../../../src/services/roomService';

// Mock the database connection
vi.mock('../../../src/database', () => ({
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
vi.mock('../../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
}));

// Mock uuid - returns 'test-uuid-1' after substring(0, 10)
vi.mock('uuid', () => ({
    v4: vi.fn(() => 'test-uuid-'),
}));

import { supabaseConnection } from '../../../src/database';
import { getUserDetails } from '../../../src/routes/routeHelper';

describe('roomService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createRoom', () => {
        it('should create a room successfully', async () => {
            // Mock user found
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

            // Mock room creation
            const mockSelectChain = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-uuid-',
                        admin_id: 1,
                        friendly_name: 'Test Room',
                        ticket_base_url: 'https://example.com',
                    },
                ],
                error: null,
            });

            const mockInsertChainRoom = vi.fn().mockReturnValue({
                select: mockSelectChain,
            });

            // Mock user addition
            const mockInsertChainUser = vi.fn().mockResolvedValue({
                error: null,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    insert: mockInsertChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChainUser,
                });

            const result = await createRoom(
                'Test Room',
                'https://example.com',
                'auth0|test123'
            );

            expect(result.success).toBe(true);
            expect(result.data?.roomId).toBe('test-uuid-');
            expect(getUserDetails).toHaveBeenCalledWith('auth0|test123');
            expect(mockInsertChainRoom).toHaveBeenCalledWith([
                {
                    room_name: 'test-uuid-',
                    admin_id: 1,
                    friendly_name: 'Test Room',
                    ticket_base_url: 'https://example.com',
                },
            ]);
            expect(mockInsertChainUser).toHaveBeenCalledWith([
                {
                    room_id: 1,
                    user_id: 1,
                },
            ]);
        });

        it('should handle missing room name', async () => {
            const result = await createRoom(
                '',
                'https://example.com',
                'auth0|test123'
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room name and user authentication are required'
            );
            expect(getUserDetails).not.toHaveBeenCalled();
        });

        it('should handle missing user sub', async () => {
            const result = await createRoom(
                'Test Room',
                'https://example.com',
                ''
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room name and user authentication are required'
            );
            expect(getUserDetails).not.toHaveBeenCalled();
        });

        it('should handle user not found', async () => {
            (getUserDetails as Mock).mockResolvedValue(null);

            const result = await createRoom(
                'Test Room',
                'https://example.com',
                'auth0|test123'
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
            expect(result.message).toBe('User not found in database');
            expect(getUserDetails).toHaveBeenCalledWith('auth0|test123');
        });

        it('should handle getUserDetails error', async () => {
            (getUserDetails as Mock).mockRejectedValue(
                new Error('Database error')
            );

            const result = await createRoom(
                'Test Room',
                'https://example.com',
                'auth0|test123'
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe(
                'Internal server error during room creation'
            );
        });

        it('should handle room creation database error', async () => {
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

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

            const result = await createRoom(
                'Test Room',
                'https://example.com',
                'auth0|test123'
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error creating room');
            expect(result.error).toEqual({ message: 'Database error' });
        });

        it('should handle user addition error', async () => {
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

            // Mock successful room creation
            const mockSelectChain = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-uuid-1',
                    },
                ],
                error: null,
            });

            const mockInsertChainRoom = vi.fn().mockReturnValue({
                select: mockSelectChain,
            });

            // Mock user addition error
            const mockInsertChainUser = vi.fn().mockResolvedValue({
                error: { message: 'User addition failed' },
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    insert: mockInsertChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChainUser,
                });

            const result = await createRoom(
                'Test Room',
                'https://example.com',
                'auth0|test123'
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error adding user to room');
        });

        it('should handle undefined baseUrl', async () => {
            (getUserDetails as Mock).mockResolvedValue({
                user_id: 1,
                auth0_sub: 'auth0|test123',
            });

            const mockSelectChain = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-uuid-',
                        admin_id: 1,
                        friendly_name: 'Test Room',
                        ticket_base_url: undefined,
                    },
                ],
                error: null,
            });

            const mockInsertChainRoom = vi.fn().mockReturnValue({
                select: mockSelectChain,
            });

            const mockInsertChainUser = vi.fn().mockResolvedValue({
                error: null,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    insert: mockInsertChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChainUser,
                });

            const result = await createRoom(
                'Test Room',
                undefined,
                'auth0|test123'
            );

            expect(result.success).toBe(true);
            expect(mockInsertChainRoom).toHaveBeenCalledWith([
                {
                    room_name: 'test-uuid-',
                    admin_id: 1,
                    friendly_name: 'Test Room',
                    ticket_base_url: undefined,
                },
            ]);
        });
    });

    describe('addTicketsToRoom', () => {
        it('should add tickets to room successfully', async () => {
            // Mock room found
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [{ room_id: 1, room_name: 'test-room' }],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            // Mock ticket insertion
            const mockInsertChain = vi.fn().mockResolvedValue({
                error: null,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    select: mockSelectChain,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChain,
                });

            const tickets = ['TICKET-1', 'TICKET-2', 'TICKET-3'];
            const result = await addTicketsToRoom('1', tickets);

            expect(result.success).toBe(true);
            expect(result.data?.message).toBe('Tickets added');
            expect(result.data?.ticketsAdded).toBe(3);
            expect(mockInsertChain).toHaveBeenCalledWith([
                { room_id: '1', ticket_number: 'TICKET-1' },
                { room_id: '1', ticket_number: 'TICKET-2' },
                { room_id: '1', ticket_number: 'TICKET-3' },
            ]);
        });

        it('should handle missing room ID', async () => {
            const result = await addTicketsToRoom('', ['TICKET-1']);

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room ID and tickets array are required'
            );
        });

        it('should handle missing tickets array', async () => {
            const result = await addTicketsToRoom('test-room', null as any);

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room ID and tickets array are required'
            );
        });

        it('should handle non-array tickets parameter', async () => {
            const result = await addTicketsToRoom(
                'test-room',
                'not-an-array' as any
            );

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room ID and tickets array are required'
            );
        });

        it('should handle room not found', async () => {
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

            const result = await addTicketsToRoom('nonexistent-room', [
                'TICKET-1',
            ]);

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
            expect(result.message).toBe('Room not found');
        });

        it('should handle database error during room lookup', async () => {
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

            const result = await addTicketsToRoom('test-room', ['TICKET-1']);

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error fetching room');
        });

        it('should handle database error during ticket insertion', async () => {
            // Mock room found
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [{ room_id: 1, room_name: 'test-room' }],
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            // Mock ticket insertion error
            const mockInsertChain = vi.fn().mockResolvedValue({
                error: { message: 'Insert failed' },
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    select: mockSelectChain,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChain,
                });

            const result = await addTicketsToRoom('test-room', ['TICKET-1']);

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error adding tickets');
        });

        it('should handle unexpected errors', async () => {
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const result = await addTicketsToRoom('test-room', ['TICKET-1']);

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe(
                'Internal server error during tickets addition'
            );
        });
    });

    describe('addSingleTicketToRoom', () => {
        it('should add single ticket to room successfully', async () => {
            // Mock room found - using room_id lookup now
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [{ room_id: '1', room_name: 'test-room-name' }],
                error: null,
            });

            const mockSelectChainRoom = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            // Mock ticket insertion - room_id is passed directly
            const mockSelectChainTicket = vi.fn().mockResolvedValue({
                data: [
                    {
                        ticket_id: 1,
                        room_id: '1',
                        ticket_number: 'TICKET-123',
                    },
                ],
                error: null,
            });

            const mockInsertChain = vi.fn().mockReturnValue({
                select: mockSelectChainTicket,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    select: mockSelectChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChain,
                });

            const result = await addSingleTicketToRoom('1', 'TICKET-123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                ticket_id: 1,
                room_id: '1',
                ticket_number: 'TICKET-123',
            });
            // Verify the room lookup uses room_id
            expect(mockEqChain).toHaveBeenCalledWith('room_id', '1');
            // Verify the insert uses roomId directly
            expect(mockInsertChain).toHaveBeenCalledWith({
                room_id: '1',
                ticket_number: 'TICKET-123',
            });
        });

        it('should handle missing room ID', async () => {
            const result = await addSingleTicketToRoom('', 'TICKET-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room ID and ticket number are required'
            );
        });

        it('should handle missing ticket number', async () => {
            const result = await addSingleTicketToRoom('1', '');

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe(
                'Room ID and ticket number are required'
            );
        });

        it('should handle room not found', async () => {
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

            const result = await addSingleTicketToRoom('999', 'TICKET-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
            expect(result.message).toBe('Room not found');
            expect(mockEqChain).toHaveBeenCalledWith('room_id', '999');
        });

        it('should handle database error during room lookup', async () => {
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            const result = await addSingleTicketToRoom('1', 'TICKET-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error fetching room');
        });

        it('should handle database error during ticket insertion', async () => {
            // Mock room found
            const mockEqChain = vi.fn().mockResolvedValue({
                data: [{ room_id: '1', room_name: 'test-room-name' }],
                error: null,
            });

            const mockSelectChainRoom = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            // Mock ticket insertion error
            const mockSelectChainTicket = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Insert failed' },
            });

            const mockInsertChain = vi.fn().mockReturnValue({
                select: mockSelectChainTicket,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({
                    select: mockSelectChainRoom,
                })
                .mockReturnValueOnce({
                    insert: mockInsertChain,
                });

            const result = await addSingleTicketToRoom('1', 'TICKET-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error adding ticket');
        });

        it('should handle unexpected errors', async () => {
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const result = await addSingleTicketToRoom('1', 'TICKET-123');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe(
                'Internal server error during ticket addition'
            );
        });
    });

    describe('getRoomDetails', () => {
        it('should get room details successfully', async () => {
            // Mock room data
            const mockEqRoom = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-room',
                        friendly_name: 'Test Room',
                        admin_id: 1,
                        auth0_sub: 'auth0|admin123',
                        created_at: '2023-01-01T00:00:00Z',
                        ticket_base_url: 'https://example.com',
                    },
                ],
                error: null,
            });

            const mockSelectRoom = vi.fn().mockReturnValue({
                eq: mockEqRoom,
            });

            // Mock users in room
            const mockEqUsers = vi.fn().mockResolvedValue({
                data: [{ user_id: 1 }, { user_id: 2 }],
                error: null,
            });

            const mockSelectUsers = vi.fn().mockReturnValue({
                eq: mockEqUsers,
            });

            // Mock user details
            const mockInUserDetails = vi.fn().mockResolvedValue({
                data: [
                    { user_id: 1, email: 'user1@example.com' },
                    { user_id: 2, email: 'user2@example.com' },
                ],
                error: null,
            });

            const mockSelectUserDetails = vi.fn().mockReturnValue({
                in: mockInUserDetails,
            });

            // Mock tickets
            const mockEqTickets = vi.fn().mockResolvedValue({
                data: [
                    { ticket_id: 1, ticket_number: 'TICKET-1' },
                    { ticket_id: 2, ticket_number: 'TICKET-2' },
                ],
                error: null,
            });

            const mockOrderTickets = vi.fn().mockReturnValue({
                eq: mockEqTickets,
            });

            const mockSelectTickets = vi.fn().mockReturnValue({
                order: mockOrderTickets,
            });

            // Mock votes
            const mockEqVotes = vi.fn().mockResolvedValue({
                data: [
                    { vote: 5, usersub: 'auth0|user1' },
                    { vote: 8, usersub: 'auth0|user2' },
                ],
                error: null,
            });

            const mockSelectVotes = vi.fn().mockReturnValue({
                eq: mockEqVotes,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelectRoom }) // Room data
                .mockReturnValueOnce({ select: mockSelectUsers }) // Users in room
                .mockReturnValueOnce({ select: mockSelectUserDetails }) // User details
                .mockReturnValueOnce({ select: mockSelectTickets }) // Tickets
                .mockReturnValueOnce({ select: mockSelectVotes }) // Votes for ticket 1
                .mockReturnValueOnce({ select: mockSelectVotes }); // Votes for ticket 2

            const result = await getRoomDetails('1');

            expect(result.success).toBe(true);
            expect(mockEqRoom).toHaveBeenCalledWith('room_id', '1');
            expect(result.data?.room).toEqual({
                adminSub: 'auth0|admin123',
                createdAt: '2023-01-01T00:00:00Z',
                friendlyName: 'Test Room',
                roomId: 1,
                roomName: 'test-room',
                ticketBaseUrl: 'https://example.com',
            });
            expect(result.data?.users).toEqual([
                { user_id: 1, email: 'user1@example.com' },
                { user_id: 2, email: 'user2@example.com' },
            ]);
            expect(result.data?.tickets).toHaveLength(2);
            expect(result.data?.tickets[0]).toEqual({
                ticket_id: 1,
                ticket_number: 'TICKET-1',
                votes: [
                    { vote: 5, usersub: 'auth0|user1' },
                    { vote: 8, usersub: 'auth0|user2' },
                ],
            });
        });

        it('should handle missing room ID', async () => {
            const result = await getRoomDetails('');

            expect(result.success).toBe(false);
            expect(result.status).toBe(400);
            expect(result.message).toBe('Room ID is required');
        });

        it('should handle room not found', async () => {
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

            const result = await getRoomDetails('999');

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
            expect(result.message).toBe('Room not found');
        });

        it('should handle database error during room fetch', async () => {
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            const result = await getRoomDetails('test-room');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error fetching room');
        });

        it('should handle database error during users fetch', async () => {
            // Mock room found
            const mockEqRoom = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-room',
                        auth0_sub: 'auth0|admin123',
                    },
                ],
                error: null,
            });

            const mockSelectRoom = vi.fn().mockReturnValue({
                eq: mockEqRoom,
            });

            // Mock users error
            const mockEqUsers = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Users fetch error' },
            });

            const mockSelectUsers = vi.fn().mockReturnValue({
                eq: mockEqUsers,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelectRoom })
                .mockReturnValueOnce({ select: mockSelectUsers });

            const result = await getRoomDetails('test-room');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error fetching users');
        });

        it('should handle database error during votes fetch', async () => {
            // Mock successful room, users, and tickets queries
            const mockEqRoom = vi.fn().mockResolvedValue({
                data: [
                    {
                        room_id: 1,
                        room_name: 'test-room',
                        auth0_sub: 'auth0|admin123',
                        created_at: '2023-01-01T00:00:00Z',
                    },
                ],
                error: null,
            });

            const mockSelectRoom = vi.fn().mockReturnValue({
                eq: mockEqRoom,
            });

            const mockEqUsers = vi.fn().mockResolvedValue({
                data: [{ user_id: 1 }],
                error: null,
            });

            const mockSelectUsers = vi.fn().mockReturnValue({
                eq: mockEqUsers,
            });

            const mockInUserDetails = vi.fn().mockResolvedValue({
                data: [{ user_id: 1, email: 'user1@example.com' }],
                error: null,
            });

            const mockSelectUserDetails = vi.fn().mockReturnValue({
                in: mockInUserDetails,
            });

            const mockEqTickets = vi.fn().mockResolvedValue({
                data: [{ ticket_id: 1, ticket_number: 'TICKET-1' }],
                error: null,
            });

            const mockOrderTickets = vi.fn().mockReturnValue({
                eq: mockEqTickets,
            });

            const mockSelectTickets = vi.fn().mockReturnValue({
                order: mockOrderTickets,
            });

            // Mock votes error
            const mockEqVotes = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Votes fetch error' },
            });

            const mockSelectVotes = vi.fn().mockReturnValue({
                eq: mockEqVotes,
            });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelectRoom })
                .mockReturnValueOnce({ select: mockSelectUsers })
                .mockReturnValueOnce({ select: mockSelectUserDetails })
                .mockReturnValueOnce({ select: mockSelectTickets })
                .mockReturnValueOnce({ select: mockSelectVotes });

            const result = await getRoomDetails('test-room');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe('Error fetching votes');
        });

        it('should handle unexpected errors', async () => {
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const result = await getRoomDetails('test-room');

            expect(result.success).toBe(false);
            expect(result.status).toBe(500);
            expect(result.message).toBe(
                'Internal server error during room details fetch'
            );
        });

        it('should handle null room data', async () => {
            const mockEqChain = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            const mockSelectChain = vi.fn().mockReturnValue({
                eq: mockEqChain,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelectChain,
            });

            const result = await getRoomDetails('test-room');

            expect(result.success).toBe(false);
            expect(result.status).toBe(404);
            expect(result.message).toBe('Room not found');
        });
    });
});
