import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Socket } from 'socket.io';
import type { Server as IOServer } from 'socket.io';
import { joinHandler } from '../../../../src/sockets/handlers/joinHandler';
import type { JoinPayload } from '../../../../src/sockets/types/socketTypes';
import * as socketUtils from '../../../../src/sockets/utils/socketUtils';
import * as socketRoomService from '../../../../src/sockets/services/socketRoomService';

// Mock the database connection
vi.mock('../../../../src/database', () => ({
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

// Mock the dependencies
vi.mock('../../../../src/sockets/utils/socketUtils');
vi.mock('../../../../src/sockets/services/socketRoomService');

describe('joinHandler', () => {
    let mockSocket: Partial<Socket>;
    let mockIo: Partial<IOServer>;
    let mockEmitError: Mock;
    let mockLogSocketEvent: Mock;
    let mockValidatePayload: Mock;
    let mockHandleJoinRoom: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup socket mocks
        mockSocket = {
            join: vi.fn(),
            to: vi.fn(() => ({
                emit: vi.fn(),
            })) as any,
            emit: vi.fn(),
        };

        mockIo = {
            in: vi.fn(() => ({
                emit: vi.fn(),
            })) as any,
        };

        // Setup utility mocks
        mockEmitError = vi.fn();
        mockLogSocketEvent = vi.fn();
        mockValidatePayload = vi.fn();
        mockHandleJoinRoom = vi.fn();

        (socketUtils.emitError as Mock) = mockEmitError;
        (socketUtils.logSocketEvent as Mock) = mockLogSocketEvent;
        (socketUtils.validatePayload as Mock) = mockValidatePayload;
        (socketRoomService.handleJoinRoom as Mock) = mockHandleJoinRoom;
    });

    describe('successful join', () => {
        it('should handle successful room join', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            const mockUsers = [
                { user_id: 1, email: 'test@example.com' },
                { user_id: 2, email: 'user2@example.com' },
            ];

            // Mock successful validation
            mockValidatePayload.mockReturnValue(null);

            // Mock successful room join
            mockHandleJoinRoom.mockResolvedValue({
                success: true,
                users: mockUsers,
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            // Verify validation was called
            expect(mockValidatePayload).toHaveBeenCalledWith(payload, [
                'roomName',
                'userSub',
            ]);

            // Verify socket joined the room
            expect(mockSocket.join).toHaveBeenCalledWith('test-room');

            // Verify logging
            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'join',
                'test-room',
                'auth0|test123'
            );

            // Verify room service was called
            expect(mockHandleJoinRoom).toHaveBeenCalledWith(
                'test-room',
                'auth0|test123'
            );

            // Verify users were notified
            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockToResult = (mockSocket.to as Mock).mock.results[0].value;
            expect(mockToResult.emit).toHaveBeenCalledWith('userJoined', {
                users: mockUsers,
            });

            // Verify no errors were emitted
            expect(mockEmitError).not.toHaveBeenCalled();
        });
    });

    describe('validation errors', () => {
        it('should handle missing roomName', async () => {
            const payload: JoinPayload = {
                roomName: '',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(
                'Missing required field: roomName'
            );

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Missing required field: roomName'
            );

            // Should not proceed with join logic
            expect(mockSocket.join).not.toHaveBeenCalled();
            expect(mockHandleJoinRoom).not.toHaveBeenCalled();
        });

        it('should handle missing userSub', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: '',
            };

            mockValidatePayload.mockReturnValue(
                'Missing required field: userSub'
            );

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Missing required field: userSub'
            );

            expect(mockSocket.join).not.toHaveBeenCalled();
            expect(mockHandleJoinRoom).not.toHaveBeenCalled();
        });

        it('should handle missing both fields', async () => {
            const payload: JoinPayload = {
                roomName: '',
                userSub: '',
            };

            mockValidatePayload.mockReturnValue(
                'Missing required field: roomName'
            );

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Missing required field: roomName'
            );
        });
    });

    describe('service errors', () => {
        it('should handle room service failure with error message', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockResolvedValue({
                success: false,
                error: { message: 'Room not found' },
                message: 'Room not found',
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockSocket.join).toHaveBeenCalledWith('test-room');
            expect(mockHandleJoinRoom).toHaveBeenCalledWith(
                'test-room',
                'auth0|test123'
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                { message: 'Room not found' },
                'Room not found'
            );

            // Should not notify other users
            expect(mockSocket.to).not.toHaveBeenCalled();
        });

        it('should handle room service failure without specific message', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockResolvedValue({
                success: false,
                error: { message: 'Database error' },
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                { message: 'Database error' },
                'Error joining room'
            );
        });

        it('should handle room service failure with custom error', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockResolvedValue({
                success: false,
                error: 'User not authorized',
                message: 'Access denied to room',
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                'User not authorized',
                'Access denied to room'
            );
        });
    });

    describe('unexpected errors', () => {
        it('should handle unexpected errors during execution', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockRejectedValue(
                new Error('Unexpected database error')
            );

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockSocket.join).toHaveBeenCalledWith('test-room');
            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during join'
            );
        });

        it('should handle errors during socket operations', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            (mockSocket.join as Mock).mockImplementation(() => {
                throw new Error('Socket error');
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during join'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle successful join with empty users array', async () => {
            const payload: JoinPayload = {
                roomName: 'empty-room',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockResolvedValue({
                success: true,
                users: [],
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockSocket.join).toHaveBeenCalledWith('empty-room');
            expect(mockHandleJoinRoom).toHaveBeenCalledWith(
                'empty-room',
                'auth0|test123'
            );

            expect(mockSocket.to).toHaveBeenCalledWith('empty-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('userJoined', {
                users: [],
            });
            expect(mockEmitError).not.toHaveBeenCalled();
        });

        it('should handle room names with special characters', async () => {
            const payload: JoinPayload = {
                roomName: 'test-room-123!@#',
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockResolvedValue({
                success: true,
                users: [],
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockSocket.join).toHaveBeenCalledWith('test-room-123!@#');
            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'join',
                'test-room-123!@#',
                'auth0|test123'
            );
        });

        it('should handle long userSub values', async () => {
            const longUserSub = 'auth0|' + 'a'.repeat(100);
            const payload: JoinPayload = {
                roomName: 'test-room',
                userSub: longUserSub,
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleJoinRoom.mockResolvedValue({
                success: true,
                users: [],
            });

            await joinHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleJoinRoom).toHaveBeenCalledWith(
                'test-room',
                longUserSub
            );
            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'join',
                'test-room',
                longUserSub
            );
        });
    });
});
