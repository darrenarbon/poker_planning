import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Socket } from 'socket.io';
import type { Server as IOServer } from 'socket.io';
import { showVotesHandler } from '../../../../src/sockets/handlers/showVotesHandler';
import type { ShowVotesPayload } from '../../../../src/sockets/types/socketTypes';
import * as socketUtils from '../../../../src/sockets/utils/socketUtils';
import * as socketTicketService from '../../../../src/sockets/services/socketTicketService';

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
vi.mock('../../../../src/sockets/services/socketTicketService');

describe('showVotesHandler', () => {
    let mockSocket: Partial<Socket>;
    let mockIo: Partial<IOServer>;
    let mockEmitError: Mock;
    let mockLogSocketEvent: Mock;
    let mockValidatePayload: Mock;
    let mockValidateTicketAndRoom: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup socket mocks
        mockSocket = {
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
        mockValidateTicketAndRoom = vi.fn();

        // Apply mocks
        (socketUtils.emitError as Mock) = mockEmitError;
        (socketUtils.logSocketEvent as Mock) = mockLogSocketEvent;
        (socketUtils.validatePayload as Mock) = mockValidatePayload;
        (socketTicketService.validateTicketAndRoom as Mock) =
            mockValidateTicketAndRoom;
    });

    describe('successful show votes', () => {
        it('should handle successful show votes request', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: true,
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockValidatePayload).toHaveBeenCalledWith(
                { roomName: 'test-room', ticketId: 123 },
                ['roomName', 'ticketId']
            );
            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'showVotes',
                'test-room',
                123
            );
            expect(mockValidateTicketAndRoom).toHaveBeenCalledWith(
                123,
                'test-room'
            );

            expect(mockIo.in).toHaveBeenCalledWith('test-room');
            const mockIn = mockIo.in as Mock;
            const mockEmit = mockIn.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('showVotes', {
                ticketId: 123,
            });
        });

        it('should handle show votes for different ticket IDs', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'another-room',
                ticketId: 456,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: true,
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockValidateTicketAndRoom).toHaveBeenCalledWith(
                456,
                'another-room'
            );

            expect(mockIo.in).toHaveBeenCalledWith('another-room');
            const mockIn = mockIo.in as Mock;
            const mockEmit = mockIn.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('showVotes', {
                ticketId: 456,
            });
        });
    });

    describe('validation errors', () => {
        it('should handle missing roomName', async () => {
            const payload: ShowVotesPayload = {
                roomName: '',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue('Room name is required');

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Room name is required'
            );
            expect(mockValidateTicketAndRoom).not.toHaveBeenCalled();
            expect(mockIo.in).not.toHaveBeenCalled();
        });

        it('should handle missing ticketId', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 0,
            };

            mockValidatePayload.mockReturnValue('Ticket ID is required');

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Ticket ID is required'
            );
            expect(mockValidateTicketAndRoom).not.toHaveBeenCalled();
            expect(mockIo.in).not.toHaveBeenCalled();
        });

        it('should handle both missing fields', async () => {
            const payload: ShowVotesPayload = {
                roomName: '',
                ticketId: 0,
            };

            mockValidatePayload.mockReturnValue('Multiple fields are required');

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Multiple fields are required'
            );
            expect(mockValidateTicketAndRoom).not.toHaveBeenCalled();
        });
    });

    describe('ticket validation errors', () => {
        it('should handle ticket not found', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 999,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: false,
                error: new Error('Ticket not found'),
                message: 'Ticket does not exist',
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Ticket does not exist'
            );
            expect(mockIo.in).not.toHaveBeenCalled();
        });

        it('should handle ticket not belonging to room', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'wrong-room',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: false,
                error: new Error('Room mismatch'),
                message: 'Ticket does not belong to this room',
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Ticket does not belong to this room'
            );
            expect(mockIo.in).not.toHaveBeenCalled();
        });

        it('should handle validation failure without specific message', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: false,
                error: new Error('Generic error'),
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Error validating ticket'
            );
        });
    });

    describe('unexpected errors', () => {
        it('should handle unexpected errors during execution', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 123,
            };

            mockValidatePayload.mockImplementation(() => {
                throw new Error('Unexpected validation error');
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during show votes'
            );
        });

        it('should handle errors during ticket validation', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockRejectedValue(
                new Error('Database timeout')
            );

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during show votes'
            );
        });

        it('should handle errors during socket emission', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: true,
            });

            // Mock io.in to throw an error
            (mockIo.in as Mock).mockImplementation(() => {
                throw new Error('Socket error');
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during show votes'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle room names with special characters', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room-@#$%^&*()',
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: true,
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'showVotes',
                'test-room-@#$%^&*()',
                123
            );

            expect(mockIo.in).toHaveBeenCalledWith('test-room-@#$%^&*()');
        });

        it('should handle large ticket IDs', async () => {
            const payload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 999999999,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: true,
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockValidateTicketAndRoom).toHaveBeenCalledWith(
                999999999,
                'test-room'
            );

            expect(mockIo.in).toHaveBeenCalledWith('test-room');
            const mockIn = mockIo.in as Mock;
            const mockEmit = mockIn.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('showVotes', {
                ticketId: 999999999,
            });
        });

        it('should handle long room names', async () => {
            const longRoomName = 'a'.repeat(255);
            const payload: ShowVotesPayload = {
                roomName: longRoomName,
                ticketId: 123,
            };

            mockValidatePayload.mockReturnValue(null);
            mockValidateTicketAndRoom.mockResolvedValue({
                success: true,
            });

            await showVotesHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockValidateTicketAndRoom).toHaveBeenCalledWith(
                123,
                longRoomName
            );

            expect(mockIo.in).toHaveBeenCalledWith(longRoomName);
        });
    });
});
