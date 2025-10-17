import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Socket } from 'socket.io';
import type { Server as IOServer } from 'socket.io';
import { setEstimateHandler } from '../../../../src/sockets/handlers/setEstimateHandler';
import type { SetEstimatePayload } from '../../../../src/sockets/types/socketTypes';
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

describe('setEstimateHandler', () => {
    let mockSocket: Partial<Socket>;
    let mockIo: Partial<IOServer>;
    let mockEmitError: Mock;
    let mockLogSocketEvent: Mock;
    let mockValidatePayload: Mock;
    let mockHandleSetEstimate: Mock;

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
        mockHandleSetEstimate = vi.fn();

        // Mock console.log
        vi.spyOn(console, 'log').mockImplementation(() => {});

        // Apply mocks
        (socketUtils.emitError as Mock) = mockEmitError;
        (socketUtils.logSocketEvent as Mock) = mockLogSocketEvent;
        (socketUtils.validatePayload as Mock) = mockValidatePayload;
        (socketTicketService.handleSetEstimate as Mock) = mockHandleSetEstimate;
    });

    describe('successful estimate setting', () => {
        it('should handle successful estimate setting', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                    title: 'Test ticket',
                    description: 'Test description',
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null) // First validation for main payload
                .mockReturnValueOnce(null); // Second validation for ticket data

            mockHandleSetEstimate.mockResolvedValue({
                success: true,
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockValidatePayload).toHaveBeenCalledTimes(2);
            expect(mockValidatePayload).toHaveBeenNthCalledWith(
                1,
                { roomName: 'test-room', currentTicket: payload.currentTicket },
                ['roomName', 'currentTicket']
            );
            expect(mockValidatePayload).toHaveBeenNthCalledWith(
                2,
                {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
                [
                    'ticket_id',
                    'chosen_estimate',
                    'average_vote',
                    'standard_deviation',
                ]
            );

            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'setEstimate',
                123,
                5,
                4.5,
                1.2
            );

            expect(mockHandleSetEstimate).toHaveBeenCalledWith(
                'test-room',
                123,
                5,
                4.5,
                1.2
            );

            expect(console.log).toHaveBeenCalledWith('ticket updated');

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('showEstimate', {
                currentTicket: payload.currentTicket,
            });
        });

        it('should handle estimate setting with zero values', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 456,
                    chosen_estimate: 0,
                    average_vote: 0,
                    standard_deviation: 0,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: true,
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleSetEstimate).toHaveBeenCalledWith(
                'test-room',
                456,
                0,
                0,
                0
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('showEstimate', {
                currentTicket: payload.currentTicket,
            });
        });
    });

    describe('validation errors', () => {
        it('should handle missing roomName', async () => {
            const payload: SetEstimatePayload = {
                roomName: '',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload.mockReturnValue('Room name is required');

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Room name is required'
            );
            expect(mockHandleSetEstimate).not.toHaveBeenCalled();
        });

        it('should handle missing currentTicket', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: null as any,
            };

            mockValidatePayload.mockReturnValue('Current ticket is required');

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Current ticket is required'
            );
            expect(mockHandleSetEstimate).not.toHaveBeenCalled();
        });

        it('should handle invalid ticket data - missing ticket_id', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 0,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null) // First validation passes
                .mockReturnValueOnce('Ticket ID is required'); // Second validation fails

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Invalid ticket data: Ticket ID is required'
            );
            expect(mockHandleSetEstimate).not.toHaveBeenCalled();
        });

        it('should handle invalid ticket data - missing chosen_estimate', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: null as any,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce('Chosen estimate is required');

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Invalid ticket data: Chosen estimate is required'
            );
        });

        it('should handle invalid ticket data - missing average_vote', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: null as any,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce('Average vote is required');

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Invalid ticket data: Average vote is required'
            );
        });

        it('should handle invalid ticket data - missing standard_deviation', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: null as any,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce('Standard deviation is required');

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                null,
                'Invalid ticket data: Standard deviation is required'
            );
        });
    });

    describe('service errors', () => {
        it('should handle service failure with error message', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: false,
                error: new Error('Database connection failed'),
                message: 'Failed to update ticket',
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Failed to update ticket'
            );
            expect(mockSocket.to).not.toHaveBeenCalled();
        });

        it('should handle service failure without specific message', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: false,
                error: new Error('Generic error'),
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Error setting estimate'
            );
        });

        it('should handle ticket not found error', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 999,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: false,
                error: new Error('Ticket not found'),
                message: 'Invalid ticket ID',
            });

            await setEstimateHandler(
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
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload.mockImplementation(() => {
                throw new Error('Unexpected validation error');
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during estimate setting'
            );
        });

        it('should handle errors during estimate processing', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockRejectedValue(
                new Error('Database timeout')
            );

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockEmitError).toHaveBeenCalledWith(
                mockSocket,
                expect.any(Error),
                'Unexpected error during estimate setting'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle large ticket ID and values', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 999999999,
                    chosen_estimate: 1000000,
                    average_vote: 999999.99,
                    standard_deviation: 888888.88,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: true,
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleSetEstimate).toHaveBeenCalledWith(
                'test-room',
                999999999,
                1000000,
                999999.99,
                888888.88
            );

            expect(mockLogSocketEvent).toHaveBeenCalledWith(
                'setEstimate',
                999999999,
                1000000,
                999999.99,
                888888.88
            );
        });

        it('should handle room names with special characters', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room-@#$%^&*()',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: true,
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleSetEstimate).toHaveBeenCalledWith(
                'test-room-@#$%^&*()',
                123,
                5,
                4.5,
                1.2
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room-@#$%^&*()');
        });

        it('should handle negative values', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: -1,
                    average_vote: -2.5,
                    standard_deviation: -0.5,
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: true,
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            expect(mockHandleSetEstimate).toHaveBeenCalledWith(
                'test-room',
                123,
                -1,
                -2.5,
                -0.5
            );
        });

        it('should handle ticket with extra properties', async () => {
            const payload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 123,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                    title: 'Extra ticket title',
                    description: 'Extra description',
                    status: 'active',
                    created_at: '2023-01-01T00:00:00Z',
                },
            };

            mockValidatePayload
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);

            mockHandleSetEstimate.mockResolvedValue({
                success: true,
            });

            await setEstimateHandler(
                payload,
                mockSocket as Socket,
                mockIo as IOServer
            );

            // Should still work with extra properties
            expect(mockHandleSetEstimate).toHaveBeenCalledWith(
                'test-room',
                123,
                5,
                4.5,
                1.2
            );

            expect(mockSocket.to).toHaveBeenCalledWith('test-room');
            const mockTo = mockSocket.to as Mock;
            const mockEmit = mockTo.mock.results[0].value.emit;
            expect(mockEmit).toHaveBeenCalledWith('showEstimate', {
                currentTicket: payload.currentTicket,
            });
        });
    });
});
