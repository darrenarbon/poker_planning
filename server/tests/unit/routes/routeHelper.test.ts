import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Response } from 'express';

// Mock the database connection BEFORE importing the modules that use it
vi.mock('../../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(),
            })),
        })),
    },
}));

import { getUserDetails, returnError } from '../../../src/routes/routeHelper';
import { supabaseConnection } from '../../../src/database';

describe('routeHelper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear console mocks
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
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
            expect(console.log).toHaveBeenCalledWith(
                'User details fetched:',
                mockUserData
            );
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
            expect(console.error).toHaveBeenCalledWith(mockError);
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

    describe('returnError', () => {
        let mockResponse: Partial<Response>;
        let mockStatus: Mock;
        let mockJson: Mock;

        beforeEach(() => {
            mockJson = vi.fn();
            mockStatus = vi.fn().mockReturnValue({ json: mockJson });
            mockResponse = {
                status: mockStatus,
            };
        });

        it('should return error response with correct status and message', () => {
            const error = new Error('Test error');
            const code = 400;
            const message = 'Bad request';
            const friendlyMessage = 'A bad request occurred';

            const result = returnError(
                mockResponse as Response,
                code,
                error,
                message,
                friendlyMessage
            );

            expect(mockStatus).toHaveBeenCalledWith(code);
            expect(mockJson).toHaveBeenCalledWith({ error: message });
            expect(console.error).toHaveBeenCalledWith(friendlyMessage, error);
            expect(result).toBe(
                mockResponse.status!(code).json({ error: message })
            );
        });

        it('should handle 500 error codes', () => {
            const error = { message: 'Internal server error' };
            const code = 500;
            const message = 'Something went wrong';

            returnError(mockResponse as Response, code, error, message);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({ error: message });
        });

        it('should handle null error objects', () => {
            const error = null;
            const code = 404;
            const message = 'Not found';

            returnError(mockResponse as Response, code, error, message);

            expect(console.error).toHaveBeenCalledWith(message, null);
            expect(mockStatus).toHaveBeenCalledWith(404);
        });
    });
});
