import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    validateTicketAndRoom,
    handleSetEstimate,
    type ShowVotesResult,
    type SetEstimateResult,
} from '../../../../src/sockets/services/socketTicketService';
import * as socketDatabase from '../../../../src/sockets/utils/socketDatabase';

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

// Mock the socket database utilities
vi.mock('../../../../src/sockets/utils/socketDatabase');

describe('socketTicketService', () => {
    let mockFindTicketById: Mock;
    let mockFindRoomByIdAndName: Mock;
    let mockFindRoomByName: Mock;
    let mockUpdateTicketEstimate: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup database utility mocks
        mockFindTicketById = vi.fn();
        mockFindRoomByIdAndName = vi.fn();
        mockFindRoomByName = vi.fn();
        mockUpdateTicketEstimate = vi.fn();

        // Apply mocks
        (socketDatabase.findTicketById as Mock) = mockFindTicketById;
        (socketDatabase.findRoomByIdAndName as Mock) = mockFindRoomByIdAndName;
        (socketDatabase.findRoomByName as Mock) = mockFindRoomByName;
        (socketDatabase.updateTicketEstimate as Mock) =
            mockUpdateTicketEstimate;
    });

    describe('validateTicketAndRoom', () => {
        describe('successful validation', () => {
            it('should successfully validate ticket and room', async () => {
                const ticketId = 123;
                const roomName = 'test-room';

                // Mock successful ticket lookup
                mockFindTicketById.mockResolvedValue({
                    data: [
                        { ticket_id: 123, room_id: 1, title: 'Test Ticket' },
                    ],
                    error: null,
                });

                // Mock successful room validation
                mockFindRoomByIdAndName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(true);
                expect(mockFindTicketById).toHaveBeenCalledWith(123);
                expect(mockFindRoomByIdAndName).toHaveBeenCalledWith(
                    1,
                    'test-room'
                );
            });

            it('should validate with different room and ticket IDs', async () => {
                const ticketId = 456;
                const roomName = 'another-room';

                mockFindTicketById.mockResolvedValue({
                    data: [
                        { ticket_id: 456, room_id: 5, title: 'Another Ticket' },
                    ],
                    error: null,
                });

                mockFindRoomByIdAndName.mockResolvedValue({
                    data: [{ room_id: 5, room_name: 'another-room' }],
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(true);
                expect(mockFindTicketById).toHaveBeenCalledWith(456);
                expect(mockFindRoomByIdAndName).toHaveBeenCalledWith(
                    5,
                    'another-room'
                );
            });
        });

        describe('ticket lookup errors', () => {
            it('should handle ticket lookup database error', async () => {
                const ticketId = 123;
                const roomName = 'test-room';

                mockFindTicketById.mockResolvedValue({
                    data: null,
                    error: new Error('Database connection failed'),
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting ticket');
                expect(mockFindRoomByIdAndName).not.toHaveBeenCalled();
            });

            it('should handle ticket not found', async () => {
                const ticketId = 999;
                const roomName = 'test-room';

                mockFindTicketById.mockResolvedValue({
                    data: [],
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.error).toBe(null);
                expect(result.message).toBe('Ticket not found');
                expect(mockFindRoomByIdAndName).not.toHaveBeenCalled();
            });

            it('should handle null ticket data', async () => {
                const ticketId = 123;
                const roomName = 'test-room';

                mockFindTicketById.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('Ticket not found');
            });
        });

        describe('room validation errors', () => {
            it('should handle room validation database error', async () => {
                const ticketId = 123;
                const roomName = 'test-room';

                mockFindTicketById.mockResolvedValue({
                    data: [
                        { ticket_id: 123, room_id: 1, title: 'Test Ticket' },
                    ],
                    error: null,
                });

                mockFindRoomByIdAndName.mockResolvedValue({
                    data: null,
                    error: new Error('Room validation failed'),
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting ticket');
            });

            it('should handle ticket not belonging to room', async () => {
                const ticketId = 123;
                const roomName = 'wrong-room';

                mockFindTicketById.mockResolvedValue({
                    data: [
                        { ticket_id: 123, room_id: 1, title: 'Test Ticket' },
                    ],
                    error: null,
                });

                mockFindRoomByIdAndName.mockResolvedValue({
                    data: [],
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.error).toBe(null);
                expect(result.message).toBe('Ticket not found');
            });

            it('should handle null room validation data', async () => {
                const ticketId = 123;
                const roomName = 'test-room';

                mockFindTicketById.mockResolvedValue({
                    data: [
                        { ticket_id: 123, room_id: 1, title: 'Test Ticket' },
                    ],
                    error: null,
                });

                mockFindRoomByIdAndName.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('Ticket not found');
            });
        });

        describe('unexpected errors', () => {
            it('should handle unexpected errors during execution', async () => {
                const ticketId = 123;
                const roomName = 'test-room';

                mockFindTicketById.mockImplementation(() => {
                    throw new Error('Unexpected database error');
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe(
                    'Unexpected error during ticket validation'
                );
            });
        });

        describe('edge cases', () => {
            it('should handle large ticket IDs', async () => {
                const ticketId = 999999999;
                const roomName = 'test-room';

                mockFindTicketById.mockResolvedValue({
                    data: [
                        {
                            ticket_id: 999999999,
                            room_id: 1,
                            title: 'Large ID Ticket',
                        },
                    ],
                    error: null,
                });

                mockFindRoomByIdAndName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(true);
                expect(mockFindTicketById).toHaveBeenCalledWith(999999999);
            });

            it('should handle room names with special characters', async () => {
                const ticketId = 123;
                const roomName = 'test-room-@#$%^&*()';

                mockFindTicketById.mockResolvedValue({
                    data: [
                        { ticket_id: 123, room_id: 1, title: 'Test Ticket' },
                    ],
                    error: null,
                });

                mockFindRoomByIdAndName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room-@#$%^&*()' }],
                    error: null,
                });

                const result: ShowVotesResult = await validateTicketAndRoom(
                    ticketId,
                    roomName
                );

                expect(result.success).toBe(true);
                expect(mockFindRoomByIdAndName).toHaveBeenCalledWith(
                    1,
                    'test-room-@#$%^&*()'
                );
            });
        });
    });

    describe('handleSetEstimate', () => {
        describe('successful estimate setting', () => {
            it('should successfully set estimate for ticket', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                // Mock successful room lookup
                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                // Mock successful ticket update
                mockUpdateTicketEstimate.mockResolvedValue({
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(true);
                expect(mockFindRoomByName).toHaveBeenCalledWith('test-room');
                expect(mockUpdateTicketEstimate).toHaveBeenCalledWith(
                    123,
                    5,
                    4.5,
                    1.2
                );
            });

            it('should handle zero values for estimates', async () => {
                const roomName = 'test-room';
                const ticketId = 456;
                const chosenEstimate = 0;
                const averageVote = 0;
                const standardDeviation = 0;

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockUpdateTicketEstimate.mockResolvedValue({
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(true);
                expect(mockUpdateTicketEstimate).toHaveBeenCalledWith(
                    456,
                    0,
                    0,
                    0
                );
            });

            it('should handle large numeric values', async () => {
                const roomName = 'test-room';
                const ticketId = 999999;
                const chosenEstimate = 1000000;
                const averageVote = 999999.99;
                const standardDeviation = 888888.88;

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockUpdateTicketEstimate.mockResolvedValue({
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(true);
                expect(mockUpdateTicketEstimate).toHaveBeenCalledWith(
                    999999,
                    1000000,
                    999999.99,
                    888888.88
                );
            });
        });

        describe('room lookup errors', () => {
            it('should handle room lookup database error', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                mockFindRoomByName.mockResolvedValue({
                    data: null,
                    error: new Error('Database connection failed'),
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting room');
                expect(mockUpdateTicketEstimate).not.toHaveBeenCalled();
            });

            it('should handle room not found', async () => {
                const roomName = 'nonexistent-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                mockFindRoomByName.mockResolvedValue({
                    data: [],
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(false);
                expect(result.error).toBe(null);
                expect(result.message).toBe('Could not find room');
            });

            it('should handle null room data', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                mockFindRoomByName.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('Could not find room');
            });
        });

        describe('ticket update errors', () => {
            it('should handle ticket update database error', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockUpdateTicketEstimate.mockResolvedValue({
                    error: new Error('Failed to update ticket'),
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error updating ticket');
            });
        });

        describe('unexpected errors', () => {
            it('should handle unexpected errors during execution', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                mockFindRoomByName.mockImplementation(() => {
                    throw new Error('Unexpected database error');
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe(
                    'Unexpected error during estimate setting'
                );
            });
        });

        describe('edge cases', () => {
            it('should handle negative values', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = -1;
                const averageVote = -2.5;
                const standardDeviation = -0.5;

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockUpdateTicketEstimate.mockResolvedValue({
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(true);
                expect(mockUpdateTicketEstimate).toHaveBeenCalledWith(
                    123,
                    -1,
                    -2.5,
                    -0.5
                );
            });

            it('should handle room names with special characters', async () => {
                const roomName = 'test-room-@#$%^&*()';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room-@#$%^&*()' }],
                    error: null,
                });

                mockUpdateTicketEstimate.mockResolvedValue({
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(true);
                expect(mockFindRoomByName).toHaveBeenCalledWith(
                    'test-room-@#$%^&*()'
                );
            });

            it('should handle decimal values', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5.75;
                const averageVote = 4.333333;
                const standardDeviation = 1.234567;

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockUpdateTicketEstimate.mockResolvedValue({
                    error: null,
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(true);
                expect(mockUpdateTicketEstimate).toHaveBeenCalledWith(
                    123,
                    5.75,
                    4.333333,
                    1.234567
                );
            });

            it('should handle room lookup with error field set but success', async () => {
                const roomName = 'test-room';
                const ticketId = 123;
                const chosenEstimate = 5;
                const averageVote = 4.5;
                const standardDeviation = 1.2;

                // Note: This tests the case where error is passed but data exists
                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: new Error('Warning but data exists'),
                });

                const result: SetEstimateResult = await handleSetEstimate(
                    roomName,
                    ticketId,
                    chosenEstimate,
                    averageVote,
                    standardDeviation
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting room');
            });
        });
    });
});
