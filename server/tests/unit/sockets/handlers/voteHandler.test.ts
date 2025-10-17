import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Socket } from 'socket.io';
import type { Server as IOServer } from 'socket.io';
import { voteHandler } from '../../../../src/sockets/handlers/voteHandler';
import type { VotePayload } from '../../../../src/sockets/types/socketTypes';
import * as socketUtils from '../../../../src/sockets/utils/socketUtils';
import * as socketVoteService from '../../../../src/sockets/services/socketVoteService';

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

// Mock the dependencies
vi.mock('../../../../src/sockets/utils/socketUtils');
vi.mock('../../../../src/sockets/services/socketVoteService');

describe('voteHandler', () => {
    let mockSocket: Partial<Socket>;
    let mockIo: Partial<IOServer>;
    let mockEmitError: Mock;
    let mockLogSocketEvent: Mock;
    let mockValidatePayload: Mock;
    let mockHandleVote: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup socket mocks
        mockSocket = {
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
        mockHandleVote = vi.fn();

        // Apply mocks
        (socketUtils.emitError as Mock) = mockEmitError;
        (socketUtils.logSocketEvent as Mock) = mockLogSocketEvent;
        (socketUtils.validatePayload as Mock) = mockValidatePayload;
        (socketVoteService.handleVote as Mock) = mockHandleVote;
    });

    describe('successful voting', () => {
        it('should handle successful vote submission', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: true,
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockValidatePayload).toHaveBeenCalledWith(
                {
                    roomName: 'test-room',
                    ticketId: 123,
                    vote: 5,
                    userSub: 'auth0|test123',
                },
                ['roomName', 'ticketId', 'userSub']
            );
            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'vote',
                'test-room',
                123,
                5,
                'auth0|test123'
            );
            expect(mockHandleVote).toHaveBeenCalledWith(
                123,
                5,
                'auth0|test123'
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('voteReceived', {
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            });
        });

        it('should handle vote with zero value', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 456,
                vote: 0,
                userSub: 'auth0|test456',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: true,
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleVote).toHaveBeenCalledWith(
                456,
                0,
                'auth0|test456'
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('voteReceived', {
                ticketId: 456,
                vote: 0,
                userSub: 'auth0|test456',
            });
        });
    });

    describe('validation errors', () => {
        it('should handle missing roomName', async () => {
            const payload: VotePayload = {
                roomName: '',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue('Room name is required');

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Room name is required'
            );
            expect(mockHandleVote).not.toHaveBeenCalled();
        });

        it('should handle missing ticketId', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 0,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue('Ticket ID is required');

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Ticket ID is required'
            );
            expect(mockHandleVote).not.toHaveBeenCalled();
        });

        it('should handle missing userSub', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: '',
            };

            mockValidatePayload.mockReturnValue(
                'User authentication is required'
            );

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'User authentication is required'
            );
            expect(mockHandleVote).not.toHaveBeenCalled();
        });
    });

    describe('service errors', () => {
        it('should handle vote service failure with error message', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: false,
                error: new Error('Database connection failed'),
                message: 'Failed to save vote',
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Failed to save vote'
            );
        });

        it('should handle vote service failure without specific message', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: false,
                error: new Error('Generic error'),
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Error processing vote'
            );
        });

        it('should handle vote service failure with custom error', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 999,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: false,
                error: new Error('Ticket not found'),
                message: 'Invalid ticket ID',
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Invalid ticket ID'
            );
        });
    });

    describe('unexpected errors', () => {
        it('should handle unexpected errors during execution', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockImplementation(() => {
                throw new Error('Unexpected validation error');
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during voting'
            );
        });

        it('should handle errors during vote processing', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockRejectedValue(new Error('Database timeout'));

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during voting'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle large vote values', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 999999,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: true,
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleVote).toHaveBeenCalledWith(
                123,
                999999,
                'auth0|test123'
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('voteReceived', {
                ticketId: 123,
                vote: 999999,
                userSub: 'auth0|test123',
            });
        });

        it('should handle negative vote values', async () => {
            const payload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: -1,
                userSub: 'auth0|test123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: true,
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleVote).toHaveBeenCalledWith(
                123,
                -1,
                'auth0|test123'
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('voteReceived', {
                ticketId: 123,
                vote: -1,
                userSub: 'auth0|test123',
            });
        });

        it('should handle room names with special characters', async () => {
            const payload: VotePayload = {
                roomName: 'test-room-@#$%^&*()',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|special-user-123',
            };

            mockValidatePayload.mockReturnValue(null);
            mockHandleVote.mockResolvedValue({
                success: true,
            });

            await voteHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'vote',
                'test-room-@#$%^&*()',
                123,
                5,
                'auth0|special-user-123'
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room-@#$%^&*()');
        });
    });
});
