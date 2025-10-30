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

import { returnError } from '../../../src/routes/routeHelper';
import { supabaseConnection } from '../../../src/database';

describe('routeHelper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear console mocks
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
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
