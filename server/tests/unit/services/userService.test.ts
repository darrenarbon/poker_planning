import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock the database connection
vi.mock('../../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(),
                })),
            })),
        })),
    },
}));

// Mock the route helper functions
vi.mock('../../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
}));

import { getUserRooms } from '../../../src/services/userService';
import { supabaseConnection } from '../../../src/database';
import { getUserDetails } from '../../../src/routes/routeHelper';
import { Room } from '../../../src/types/room';
import { User } from '../../../src/types/user';

describe('UserService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getUserDetails as Mock).mockReset();
    });

    const mockUser: User = {
        user_id: 1,
        auth0_sub: 'auth0|123456789',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        created_at: '2025-01-01T00:00:00.000Z',
        superuser: false,
    };

    const mockRooms: Room[] = [
        {
            room_id: 1,
            room_name: 'Test Room 1',
            admin_id: 1,
            created_at: '2025-01-01T10:00:00.000Z',
            friendly_name: 'Friendly Room 1',
        },
        {
            room_id: 2,
            room_name: 'Test Room 2',
            admin_id: 1,
            created_at: '2025-01-01T09:00:00.000Z',
            friendly_name: 'Friendly Room 2',
        },
    ];

    describe('getUserRooms', () => {
        it('should return user rooms successfully', async () => {
            // Mock getUserDetails to return user
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database query chain
            const mockOrder = vi.fn().mockResolvedValue({
                data: mockRooms,
                error: null,
            });
            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });
            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await getUserRooms('auth0|123456789');

            expect(result).toEqual({
                success: true,
                rooms: mockRooms,
            });

            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
            expect(supabaseConnection.from).toHaveBeenCalledWith('room');
            expect(mockSelect).toHaveBeenCalledWith(`
                room_id,
                room_name,
                admin_id,
                created_at,
                friendly_name
            `);
            expect(mockEq).toHaveBeenCalledWith('admin_id', mockUser.user_id);
            expect(mockOrder).toHaveBeenCalledWith('created_at', {
                ascending: false,
            });
        });

        it('should return error when user not found', async () => {
            // Mock getUserDetails to return null
            (getUserDetails as Mock).mockResolvedValue(null);

            const result = await getUserRooms('auth0|nonexistent');

            expect(result).toEqual({
                success: false,
                message: 'User not found',
                error: null,
            });

            expect(getUserDetails).toHaveBeenCalledWith('auth0|nonexistent');
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should handle database error when fetching rooms', async () => {
            // Mock getUserDetails to return user
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database error
            const mockError = { message: 'Database connection failed' };
            const mockOrder = vi.fn().mockResolvedValue({
                data: null,
                error: mockError,
            });
            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });
            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await getUserRooms('auth0|123456789');

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Error fetching rooms for user',
            });
        });

        it('should handle getUserDetails error', async () => {
            // Mock getUserDetails to throw error
            const mockError = new Error('Database connection failed');
            (getUserDetails as Mock).mockRejectedValue(mockError);

            const result = await getUserRooms('auth0|123456789');

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Internal server error while fetching user rooms',
            });

            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
        });

        it('should return empty array when user has no rooms', async () => {
            // Mock getUserDetails to return user
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock empty rooms result
            const mockOrder = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });
            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });
            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await getUserRooms('auth0|123456789');

            expect(result).toEqual({
                success: true,
                rooms: [],
            });
        });

        it('should handle null data from database', async () => {
            // Mock getUserDetails to return user
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock null data result
            const mockOrder = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });
            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });
            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await getUserRooms('auth0|123456789');

            expect(result).toEqual({
                success: true,
                rooms: [],
            });
        });

        it('should handle unexpected errors during database query', async () => {
            // Mock getUserDetails to return user
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database query to throw error
            const mockSelect = vi.fn().mockImplementation(() => {
                throw new Error('Unexpected database error');
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await getUserRooms('auth0|123456789');

            expect(result.success).toBe(false);
            expect(result.message).toBe(
                'Internal server error while fetching user rooms'
            );
            expect(result.error).toBeInstanceOf(Error);
        });

        it('should validate userSub parameter type', async () => {
            // This tests the function with valid string input
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            const mockOrder = vi.fn().mockResolvedValue({
                data: mockRooms,
                error: null,
            });
            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });
            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await getUserRooms('auth0|123456789');

            expect(result.success).toBe(true);
            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
        });
    });
});
