import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Auth0User } from '../../../src/types/auth';

// Mock the database connection
vi.mock('../../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(),
            })),
            select: vi.fn(() => ({
                eq: vi.fn(),
            })),
        })),
    },
}));

// Mock the Auth0 JWT middleware before importing anything else
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

import {
    validateUserData,
    handleUserLogin,
    getUserDetails,
    createUser,
} from '../../../src/services/authService';
import { supabaseConnection } from '../../../src/database';

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockAuth0User: Auth0User = {
        sub: 'auth0|123456789',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        nickname: 'johndoe',
        picture: 'https://example.com/avatar.jpg',
    };

    const mockDatabaseUser = {
        id: 1,
        auth0_sub: 'auth0|123456789',
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        nickname: 'johndoe',
        picture: 'https://example.com/avatar.jpg',
        is_active: true,
        created_at: '2025-01-01T00:00:00.000Z',
    };

    describe('validateUserData', () => {
        it('should return true for valid user data', () => {
            const result = validateUserData(mockAuth0User);
            expect(result).toBe(true);
        });

        it('should return false for null user', () => {
            const result = validateUserData(null);
            expect(result).toBe(false);
        });

        it('should return false for undefined user', () => {
            const result = validateUserData(undefined);
            expect(result).toBe(false);
        });

        it('should return false for non-object user', () => {
            const result = validateUserData('not an object');
            expect(result).toBe(false);
        });

        it('should return false for user without sub', () => {
            const invalidUser = { email: 'test@example.com' };
            const result = validateUserData(invalidUser);
            expect(result).toBe(false);
        });

        it('should return false for user with non-string sub', () => {
            const invalidUser = { sub: 123, email: 'test@example.com' };
            const result = validateUserData(invalidUser);
            expect(result).toBe(false);
        });

        it('should return false for user without email', () => {
            const invalidUser = { sub: 'auth0|123' };
            const result = validateUserData(invalidUser);
            expect(result).toBe(false);
        });

        it('should return false for user with non-string email', () => {
            const invalidUser = { sub: 'auth0|123', email: 123 };
            const result = validateUserData(invalidUser);
            expect(result).toBe(false);
        });

        it('should return true for user with only required fields', () => {
            const minimalUser = { sub: 'auth0|123', email: 'test@example.com' };
            const result = validateUserData(minimalUser);
            expect(result).toBe(true);
        });
    });

    describe('createUser', () => {
        it('should create user successfully', async () => {
            const mockSelect = vi
                .fn()
                .mockResolvedValue({ data: null, error: null });
            const mockInsert = vi.fn().mockReturnValue({
                select: mockSelect,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const result = await createUser(mockAuth0User);

            expect(result.error).toBeNull();
            expect(supabaseConnection.from).toHaveBeenCalledWith('user');
            expect(mockInsert).toHaveBeenCalledWith({
                auth0_sub: mockAuth0User.sub,
                email: mockAuth0User.email,
                given_name: mockAuth0User.given_name,
                family_name: mockAuth0User.family_name,
                nickname: mockAuth0User.nickname,
                picture: mockAuth0User.picture,
            });
        });

        it('should handle database error during user creation', async () => {
            const mockError = { message: 'Database constraint violation' };
            const mockSelect = vi
                .fn()
                .mockResolvedValue({ data: null, error: mockError });
            const mockInsert = vi.fn().mockReturnValue({
                select: mockSelect,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const result = await createUser(mockAuth0User);

            expect(result.error).toEqual(mockError);
        });

        it('should handle user with minimal data', async () => {
            const minimalUser: Auth0User = {
                sub: 'auth0|123',
                email: 'test@example.com',
            };
            const mockSelect = vi
                .fn()
                .mockResolvedValue({ data: null, error: null });
            const mockInsert = vi.fn().mockReturnValue({
                select: mockSelect,
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            await createUser(minimalUser);

            expect(mockInsert).toHaveBeenCalledWith({
                auth0_sub: minimalUser.sub,
                email: minimalUser.email,
                given_name: undefined,
                family_name: undefined,
                nickname: undefined,
                picture: undefined,
            });
        });
    });

    describe('handleUserLogin', () => {
        it('should return existing user when user already exists', async () => {
            // Mock getUserDetails to return existing user
            const mockEq = vi.fn().mockResolvedValue({
                data: [mockDatabaseUser],
                error: null,
            });
            const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: true,
                user: mockDatabaseUser,
                isNewUser: false,
            });
            expect(supabaseConnection.from).toHaveBeenCalledWith('user');
        });

        it('should create new user when user does not exist', async () => {
            // Create separate mock functions for each database call
            const mockEq1 = vi
                .fn()
                .mockResolvedValue({ data: [], error: null });
            const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

            // Mock createUser insert operation - should return the created user
            const mockSelectForInsert = vi
                .fn()
                .mockResolvedValue({ data: [mockDatabaseUser], error: null });
            const mockInsert = vi
                .fn()
                .mockReturnValue({ select: mockSelectForInsert });

            // Set up the mock chain for two separate database calls
            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelect1 }) // First getUserDetails - user doesn't exist
                .mockReturnValueOnce({ insert: mockInsert }); // createUser - returns created user

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: true,
                user: mockDatabaseUser,
                isNewUser: true,
            });
            expect(supabaseConnection.from).toHaveBeenCalledTimes(2);
            expect(mockEq1).toHaveBeenCalledWith(
                'auth0_sub',
                mockAuth0User.sub
            );
        });

        it('should handle database error during user creation', async () => {
            // Mock getUserDetails to return null (user doesn't exist)
            const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
            const mockSelectForGet = vi.fn().mockReturnValue({ eq: mockEq });

            // Mock createUser to return error
            const mockError = { message: 'Database error' };
            const mockSelectForInsert = vi
                .fn()
                .mockResolvedValue({ data: null, error: mockError });
            const mockInsert = vi
                .fn()
                .mockReturnValue({ select: mockSelectForInsert });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelectForGet }) // Call for getUserDetails
                .mockReturnValueOnce({ insert: mockInsert }); // Call for createUser

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Error creating user',
            });
        });

        it('should handle getUserDetails error', async () => {
            const mockError = new Error('Database connection failed');
            const mockEq = vi
                .fn()
                .mockResolvedValue({ data: null, error: mockError });
            const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Internal server error during login',
            });
        });

        it('should handle unexpected errors during user creation', async () => {
            // Mock getUserDetails to return null (user doesn't exist)
            const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
            const mockSelectForGet = vi.fn().mockReturnValue({ eq: mockEq });

            // Mock createUser to throw unexpected error
            const mockSelectForInsert = vi
                .fn()
                .mockRejectedValue(new Error('Unexpected error'));
            const mockInsert = vi
                .fn()
                .mockReturnValue({ select: mockSelectForInsert });

            (supabaseConnection.from as Mock)
                .mockReturnValueOnce({ select: mockSelectForGet }) // Call for getUserDetails
                .mockReturnValueOnce({ insert: mockInsert }); // Call for createUser

            const result = await handleUserLogin(mockAuth0User);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Internal server error during login');
        });
    });

    describe('getUserDetails', () => {
        it('should return user data when user exists', async () => {
            const mockUserData = {
                id: 1,
                auth0_sub: 'auth0|123',
                email: 'test@example.com',
                name: 'Test User',
            };

            const mockQuery = {
                eq: vi.fn().mockResolvedValue({
                    data: [mockUserData],
                    error: null,
                }),
            };

            const mockSelect = {
                select: vi.fn().mockReturnValue(mockQuery),
            };

            (supabaseConnection.from as Mock).mockReturnValue(mockSelect);

            const result = await getUserDetails('auth0|123');

            expect(supabaseConnection.from).toHaveBeenCalledWith('user');
            expect(mockSelect.select).toHaveBeenCalled();
            expect(mockQuery.eq).toHaveBeenCalledWith('auth0_sub', 'auth0|123');
            expect(result).toEqual(mockUserData);
        });

        it('should throw error when database query fails', async () => {
            const mockError = new Error('Database connection failed');

            const mockQuery = {
                eq: vi.fn().mockResolvedValue({
                    data: null,
                    error: mockError,
                }),
            };

            const mockSelect = {
                select: vi.fn().mockReturnValue(mockQuery),
            };

            (supabaseConnection.from as Mock).mockReturnValue(mockSelect);

            await expect(getUserDetails('auth0|123')).rejects.toThrow(
                'Database connection failed'
            );
        });

        it('should return undefined when user not found', async () => {
            const mockQuery = {
                eq: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            };

            const mockSelect = {
                select: vi.fn().mockReturnValue(mockQuery),
            };

            (supabaseConnection.from as Mock).mockReturnValue(mockSelect);

            const result = await getUserDetails('nonexistent');

            expect(result).toBeUndefined();
        });
    });
});
