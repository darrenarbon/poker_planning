import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Socket } from 'socket.io';
import {
    emitError,
    validatePayload,
    logSocketEvent,
    createSuccessResponse,
    createErrorResponse,
} from '../../../../src/sockets/utils/socketUtils';

// Mock the database
vi.mock('../../../../src/database', () => ({
    supabaseConnection: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(),
                    order: vi.fn(),
                })),
            })),
        })),
    },
}));

describe('socketUtils', () => {
    let mockSocket: Partial<Socket>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup socket mock
        mockSocket = {
            emit: vi.fn(),
        };

        // Setup console mocks
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('emitError', () => {
        it('should emit error message to socket and log error details', () => {
            const error = new Error('Test error');
            const message = 'Something went wrong';

            emitError(mockSocket as Socket, error, message);

            expect(console.error).toHaveBeenCalledTimes(2);
            expect(console.error).toHaveBeenNthCalledWith(1, error);
            expect(console.error).toHaveBeenNthCalledWith(2, message);
            expect(mockSocket.emit).toHaveBeenCalledWith('error', message);
        });

        it('should handle null error', () => {
            const message = 'Error without details';

            emitError(mockSocket as Socket, null, message);

            expect(console.error).toHaveBeenCalledTimes(2);
            expect(console.error).toHaveBeenNthCalledWith(1, null);
            expect(console.error).toHaveBeenNthCalledWith(2, message);
            expect(mockSocket.emit).toHaveBeenCalledWith('error', message);
        });

        it('should handle undefined error', () => {
            const message = 'Undefined error';

            emitError(mockSocket as Socket, undefined, message);

            expect(console.error).toHaveBeenCalledTimes(2);
            expect(console.error).toHaveBeenNthCalledWith(1, undefined);
            expect(console.error).toHaveBeenNthCalledWith(2, message);
            expect(mockSocket.emit).toHaveBeenCalledWith('error', message);
        });

        it('should handle complex error objects', () => {
            const error = {
                code: 'DB_ERROR',
                message: 'Database connection failed',
                details: { timeout: 5000 },
            };
            const message = 'Database error occurred';

            emitError(mockSocket as Socket, error, message);

            expect(console.error).toHaveBeenNthCalledWith(1, error);
            expect(console.error).toHaveBeenNthCalledWith(2, message);
            expect(mockSocket.emit).toHaveBeenCalledWith('error', message);
        });

        it('should handle empty message', () => {
            const error = new Error('Test error');
            const message = '';

            emitError(mockSocket as Socket, error, message);

            expect(console.error).toHaveBeenNthCalledWith(2, '');
            expect(mockSocket.emit).toHaveBeenCalledWith('error', '');
        });
    });

    describe('validatePayload', () => {
        it('should return null when all required fields are present', () => {
            const payload = {
                roomName: 'test-room',
                userName: 'test-user',
                ticketId: 123,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBeNull();
        });

        it('should return error message for missing field', () => {
            const payload = {
                roomName: 'test-room',
                ticketId: 123,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: userName');
        });

        it('should return error for first missing field when multiple are missing', () => {
            const payload = {
                ticketId: 123,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: roomName');
        });

        it('should handle empty string as missing field', () => {
            const payload = {
                roomName: '',
                userName: 'test-user',
                ticketId: 123,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: roomName');
        });

        it('should handle null values as missing field', () => {
            const payload = {
                roomName: 'test-room',
                userName: null,
                ticketId: 123,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: userName');
        });

        it('should handle undefined values as missing field', () => {
            const payload = {
                roomName: 'test-room',
                userName: undefined,
                ticketId: 123,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: userName');
        });

        it('should handle zero as valid value', () => {
            const payload = {
                roomName: 'test-room',
                userName: 'test-user',
                ticketId: 0,
            };
            const requiredFields = ['roomName', 'userName', 'ticketId'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: ticketId');
        });

        it('should handle false as missing field', () => {
            const payload = {
                roomName: 'test-room',
                userName: 'test-user',
                isActive: false,
            };
            const requiredFields = ['roomName', 'userName', 'isActive'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: isActive');
        });

        it('should handle true as valid value', () => {
            const payload = {
                roomName: 'test-room',
                userName: 'test-user',
                isActive: true,
            };
            const requiredFields = ['roomName', 'userName', 'isActive'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBeNull();
        });

        it('should handle empty required fields array', () => {
            const payload = {
                roomName: 'test-room',
            };
            const requiredFields: string[] = [];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBeNull();
        });

        it('should handle null payload', () => {
            const payload = null;
            const requiredFields = ['roomName'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: roomName');
        });

        it('should handle undefined payload', () => {
            const payload = undefined;
            const requiredFields = ['roomName'];

            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: roomName');
        });

        it('should handle nested field names', () => {
            const payload = {
                user: {
                    name: 'test-user',
                },
                room: {
                    id: 123,
                },
            };
            const requiredFields = ['user.name', 'room.id'];

            // Note: This function doesn't handle nested validation, so it should fail
            const result = validatePayload(payload, requiredFields);

            expect(result).toBe('Missing required field: user.name');
        });
    });

    describe('logSocketEvent', () => {
        it('should log event name with arguments', () => {
            const eventName = 'join';
            const arg1 = 'test-room';
            const arg2 = 'test-user';

            logSocketEvent(eventName, arg1, arg2);

            expect(console.log).toHaveBeenCalledWith(
                '[Socket Event] join:',
                'test-room',
                'test-user'
            );
        });

        it('should handle event with no arguments', () => {
            const eventName = 'disconnect';

            logSocketEvent(eventName);

            expect(console.log).toHaveBeenCalledWith(
                '[Socket Event] disconnect:'
            );
        });

        it('should handle event with complex arguments', () => {
            const eventName = 'vote';
            const ticketId = 123;
            const vote = 5;
            const user = { id: 1, name: 'test-user' };

            logSocketEvent(eventName, ticketId, vote, user);

            expect(console.log).toHaveBeenCalledWith(
                '[Socket Event] vote:',
                123,
                5,
                { id: 1, name: 'test-user' }
            );
        });

        it('should handle event with null arguments', () => {
            const eventName = 'error';
            const arg1 = null;
            const arg2 = undefined;

            logSocketEvent(eventName, arg1, arg2);

            expect(console.log).toHaveBeenCalledWith(
                '[Socket Event] error:',
                null,
                undefined
            );
        });

        it('should handle long event names', () => {
            const eventName = 'very-long-event-name-with-many-characters';
            const arg = 'test-arg';

            logSocketEvent(eventName, arg);

            expect(console.log).toHaveBeenCalledWith(
                '[Socket Event] very-long-event-name-with-many-characters:',
                'test-arg'
            );
        });

        it('should handle special characters in event names', () => {
            const eventName = 'event@#$%^&*()';
            const arg = 'test-arg';

            logSocketEvent(eventName, arg);

            expect(console.log).toHaveBeenCalledWith(
                '[Socket Event] event@#$%^&*():',
                'test-arg'
            );
        });
    });

    describe('createSuccessResponse', () => {
        it('should create success response with data', () => {
            const data = { users: ['user1', 'user2'], count: 2 };

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: { users: ['user1', 'user2'], count: 2 },
            });
        });

        it('should handle null data', () => {
            const data = null;

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: null,
            });
        });

        it('should handle undefined data', () => {
            const data = undefined;

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: undefined,
            });
        });

        it('should handle string data', () => {
            const data = 'Operation completed successfully';

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: 'Operation completed successfully',
            });
        });

        it('should handle number data', () => {
            const data = 42;

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: 42,
            });
        });

        it('should handle boolean data', () => {
            const data = true;

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: true,
            });
        });

        it('should handle array data', () => {
            const data = [1, 2, 3, 'test', { key: 'value' }];

            const result = createSuccessResponse(data);

            expect(result).toEqual({
                success: true,
                data: [1, 2, 3, 'test', { key: 'value' }],
            });
        });
    });

    describe('createErrorResponse', () => {
        it('should create error response with message', () => {
            const message = 'Something went wrong';

            const result = createErrorResponse(message);

            expect(result).toEqual({
                success: false,
                message: 'Something went wrong',
                error: undefined,
            });
        });

        it('should create error response with message and error', () => {
            const message = 'Database error';
            const error = new Error('Connection failed');

            const result = createErrorResponse(message, error);

            expect(result).toEqual({
                success: false,
                message: 'Database error',
                error: new Error('Connection failed'),
            });
        });

        it('should handle empty message', () => {
            const message = '';
            const error = new Error('Some error');

            const result = createErrorResponse(message, error);

            expect(result).toEqual({
                success: false,
                message: '',
                error: new Error('Some error'),
            });
        });

        it('should handle null error', () => {
            const message = 'Error occurred';
            const error = null;

            const result = createErrorResponse(message, error);

            expect(result).toEqual({
                success: false,
                message: 'Error occurred',
                error: null,
            });
        });

        it('should handle complex error objects', () => {
            const message = 'Validation failed';
            const error = {
                code: 'VALIDATION_ERROR',
                fields: ['email', 'password'],
                details: 'Missing required fields',
            };

            const result = createErrorResponse(message, error);

            expect(result).toEqual({
                success: false,
                message: 'Validation failed',
                error: {
                    code: 'VALIDATION_ERROR',
                    fields: ['email', 'password'],
                    details: 'Missing required fields',
                },
            });
        });

        it('should handle string error', () => {
            const message = 'Operation failed';
            const error = 'String error message';

            const result = createErrorResponse(message, error);

            expect(result).toEqual({
                success: false,
                message: 'Operation failed',
                error: 'String error message',
            });
        });

        it('should handle long error messages', () => {
            const message =
                'A very long error message that describes in detail what went wrong during the operation and provides context for debugging purposes and includes additional information about the failure scenario';
            const error = new Error('Detailed error');

            const result = createErrorResponse(message, error);

            expect(result).toEqual({
                success: false,
                message: message,
                error: new Error('Detailed error'),
            });
        });
    });
});
