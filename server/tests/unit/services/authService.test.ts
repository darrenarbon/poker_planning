import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Auth0User } from '../../../src/types/auth';

// Mock the database connection
vi.mock('../../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            insert: vi.fn(),
            update: vi.fn(() => ({
                eq: vi.fn(),
            })),
        })),
    },
}));

// Mock the route helper functions
vi.mock('../../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
}));

// Mock the Auth0 JWT middleware before importing anything else
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

import {
    validateUserData,
    createUser,
    handleUserLogin,
    formatUserResponse,
    updateUserProfile,
    deleteUserAccount,
} from '../../../src/services/authService';
import { supabaseConnection } from '../../../src/database';
import { getUserDetails } from '../../../src/routes/routeHelper';

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getUserDetails as Mock).mockReset();
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
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
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
            const mockInsert = vi.fn().mockResolvedValue({ error: mockError });
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
            const mockInsert = vi.fn().mockResolvedValue({ error: null });
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
            (getUserDetails as Mock).mockResolvedValue(mockDatabaseUser);

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: true,
                user: mockDatabaseUser,
                isNewUser: false,
            });
            expect(getUserDetails).toHaveBeenCalledWith(mockAuth0User.sub);
        });

        it('should create new user when user does not exist', async () => {
            (getUserDetails as Mock)
                .mockResolvedValueOnce(null) // First call - user doesn't exist
                .mockResolvedValueOnce(mockDatabaseUser); // Second call - newly created user

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: true,
                user: mockDatabaseUser,
                isNewUser: true,
            });
            expect(getUserDetails).toHaveBeenCalledTimes(2);
            expect(mockInsert).toHaveBeenCalled();
        });

        it('should handle database error during user creation', async () => {
            (getUserDetails as Mock).mockResolvedValue(null);
            const mockError = { message: 'Database error' };
            const mockInsert = vi.fn().mockResolvedValue({ error: mockError });
            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Error creating user',
            });
        });

        it('should handle getUserDetails error', async () => {
            const mockError = new Error('Database connection failed');
            (getUserDetails as Mock).mockRejectedValue(mockError);

            const result = await handleUserLogin(mockAuth0User);

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Internal server error during login',
            });
        });

        it('should handle unexpected errors during user creation', async () => {
            (getUserDetails as Mock).mockResolvedValueOnce(null);
            const mockInsert = vi
                .fn()
                .mockRejectedValue(new Error('Unexpected error'));
            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const result = await handleUserLogin(mockAuth0User);

            expect(result.success).toBe(false);
            expect(result.message).toBe('Internal server error during login');
        });
    });

    describe('formatUserResponse', () => {
        it('should format user with full name', () => {
            const result = formatUserResponse(mockDatabaseUser);

            expect(result).toEqual({
                id: mockDatabaseUser.id,
                email: mockDatabaseUser.email,
                name: 'John Doe',
                auth0_sub: mockDatabaseUser.auth0_sub,
                picture: mockDatabaseUser.picture,
            });
        });

        it('should use nickname when name parts are missing', () => {
            const userWithNickname = {
                ...mockDatabaseUser,
                given_name: undefined,
                family_name: undefined,
            };

            const result = formatUserResponse(userWithNickname);

            expect(result.name).toBe(userWithNickname.nickname);
        });

        it('should use email when both name and nickname are missing', () => {
            const userWithEmailOnly = {
                ...mockDatabaseUser,
                given_name: undefined,
                family_name: undefined,
                nickname: undefined,
            };

            const result = formatUserResponse(userWithEmailOnly);

            expect(result.name).toBe(userWithEmailOnly.email);
        });

        it('should handle null/undefined user', () => {
            const result = formatUserResponse(null);

            expect(result).toEqual({
                id: undefined,
                email: undefined,
                name: undefined,
                auth0_sub: undefined,
                picture: undefined,
            });
        });

        it('should handle user with only given_name', () => {
            const userWithGivenName = {
                ...mockDatabaseUser,
                family_name: undefined,
            };

            const result = formatUserResponse(userWithGivenName);

            expect(result.name).toBe(userWithGivenName.nickname);
        });
    });

    describe('updateUserProfile', () => {
        it('should update user profile successfully', async () => {
            const updateData = {
                email: 'newemail@example.com',
                given_name: 'Jane',
            };
            const updatedUser = { ...mockDatabaseUser, ...updateData };

            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
            (supabaseConnection.from as Mock).mockReturnValue({
                update: mockUpdate,
            });
            (getUserDetails as Mock).mockResolvedValue(updatedUser);

            const result = await updateUserProfile(
                mockAuth0User.sub,
                updateData
            );

            expect(result).toEqual({
                success: true,
                user: updatedUser,
            });
            expect(mockUpdate).toHaveBeenCalledWith({
                email: updateData.email,
                given_name: updateData.given_name,
                family_name: undefined,
                nickname: undefined,
                picture: undefined,
                updated_at: expect.any(String),
            });
            expect(mockEq).toHaveBeenCalledWith('auth0_sub', mockAuth0User.sub);
        });

        it('should handle database error during update', async () => {
            const updateData = { email: 'newemail@example.com' };
            const mockError = { message: 'Database update failed' };
            const mockEq = vi.fn().mockResolvedValue({ error: mockError });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
            (supabaseConnection.from as Mock).mockReturnValue({
                update: mockUpdate,
            });

            const result = await updateUserProfile(
                mockAuth0User.sub,
                updateData
            );

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Error updating user profile',
            });
        });

        it('should handle unexpected errors during update', async () => {
            const updateData = { email: 'newemail@example.com' };
            const mockUpdate = vi.fn().mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                update: mockUpdate,
            });

            const result = await updateUserProfile(
                mockAuth0User.sub,
                updateData
            );

            expect(result.success).toBe(false);
            expect(result.message).toBe(
                'Internal server error during profile update'
            );
        });
    });

    describe('deleteUserAccount', () => {
        it('should soft delete user account successfully', async () => {
            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
            (supabaseConnection.from as Mock).mockReturnValue({
                update: mockUpdate,
            });

            const result = await deleteUserAccount(mockAuth0User.sub);

            expect(result).toEqual({
                success: true,
                message: 'User account deleted successfully',
            });
            expect(mockUpdate).toHaveBeenCalledWith({
                is_active: false,
                deleted_at: expect.any(String),
            });
            expect(mockEq).toHaveBeenCalledWith('auth0_sub', mockAuth0User.sub);
        });

        it('should handle database error during deletion', async () => {
            const mockError = { message: 'Database deletion failed' };
            const mockEq = vi.fn().mockResolvedValue({ error: mockError });
            const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
            (supabaseConnection.from as Mock).mockReturnValue({
                update: mockUpdate,
            });

            const result = await deleteUserAccount(mockAuth0User.sub);

            expect(result).toEqual({
                success: false,
                error: mockError,
                message: 'Error deleting user account',
            });
        });

        it('should handle unexpected errors during deletion', async () => {
            const mockUpdate = vi.fn().mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            (supabaseConnection.from as Mock).mockReturnValue({
                update: mockUpdate,
            });

            const result = await deleteUserAccount(mockAuth0User.sub);

            expect(result.success).toBe(false);
            expect(result.message).toBe(
                'Internal server error during account deletion'
            );
        });
    });
});
