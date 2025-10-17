import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import sockets from '../../../src/sockets/index';
import type {
    JoinPayload,
    VotePayload,
    ShowVotesPayload,
    SetEstimatePayload,
} from '../../../src/sockets/types/socketTypes';

// Mock all handlers
vi.mock('../../../src/sockets/handlers/joinHandler', () => ({
    joinHandler: vi.fn(),
}));

vi.mock('../../../src/sockets/handlers/voteHandler', () => ({
    voteHandler: vi.fn(),
}));

vi.mock('../../../src/sockets/handlers/showVotesHandler', () => ({
    showVotesHandler: vi.fn(),
}));

vi.mock('../../../src/sockets/handlers/setEstimateHandler', () => ({
    setEstimateHandler: vi.fn(),
}));

import { joinHandler } from '../../../src/sockets/handlers/joinHandler';
import { voteHandler } from '../../../src/sockets/handlers/voteHandler';
import { showVotesHandler } from '../../../src/sockets/handlers/showVotesHandler';
import { setEstimateHandler } from '../../../src/sockets/handlers/setEstimateHandler';

describe('Sockets Index', () => {
    let mockSocket: Partial<Socket>;
    let mockIo: Partial<IOServer>;
    let socketOnSpy: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock socket with on method
        socketOnSpy = vi.fn();
        mockSocket = {
            on: socketOnSpy,
        };

        // Create mock io server
        mockIo = {};

        // Reset all handler mocks
        (joinHandler as Mock).mockClear();
        (voteHandler as Mock).mockClear();
        (showVotesHandler as Mock).mockClear();
        (setEstimateHandler as Mock).mockClear();
    });

    // Helper function to get event handler safely
    const getEventHandler = (eventName: string) => {
        const call = socketOnSpy.mock.calls.find(
            (call) => call[0] === eventName
        );
        expect(call).toBeDefined();
        return call![1];
    };

    describe('Event Registration', () => {
        it('should register all socket event listeners', () => {
            // Act
            sockets(mockSocket as Socket, mockIo as IOServer);

            // Assert - verify all events are registered
            expect(socketOnSpy).toHaveBeenCalledTimes(4);
            expect(socketOnSpy).toHaveBeenCalledWith(
                'join',
                expect.any(Function)
            );
            expect(socketOnSpy).toHaveBeenCalledWith(
                'vote',
                expect.any(Function)
            );
            expect(socketOnSpy).toHaveBeenCalledWith(
                'showVotes',
                expect.any(Function)
            );
            expect(socketOnSpy).toHaveBeenCalledWith(
                'setEstimate',
                expect.any(Function)
            );
        });

        it('should register events in correct order', () => {
            // Act
            sockets(mockSocket as Socket, mockIo as IOServer);

            // Assert - verify event registration order
            expect(socketOnSpy.mock.calls[0][0]).toBe('join');
            expect(socketOnSpy.mock.calls[1][0]).toBe('vote');
            expect(socketOnSpy.mock.calls[2][0]).toBe('showVotes');
            expect(socketOnSpy.mock.calls[3][0]).toBe('setEstimate');
        });
    });

    describe('Join Event Handler', () => {
        it('should call joinHandler when join event is triggered', () => {
            // Arrange
            const joinPayload: JoinPayload = {
                roomName: 'test-room',
                userSub: 'auth0|test123',
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const joinEventHandler = getEventHandler('join');

            // Act
            joinEventHandler(joinPayload);

            // Assert
            expect(joinHandler).toHaveBeenCalledTimes(1);
            expect(joinHandler).toHaveBeenCalledWith(
                joinPayload,
                mockSocket,
                mockIo
            );
        });

        it('should pass correct parameters to joinHandler', () => {
            // Arrange
            const joinPayload: JoinPayload = {
                roomName: 'poker-room-123',
                userSub: 'auth0|user456',
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const joinEventHandler = getEventHandler('join');

            // Act
            joinEventHandler(joinPayload);

            // Assert
            expect(joinHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    roomName: 'poker-room-123',
                    userSub: 'auth0|user456',
                }),
                mockSocket,
                mockIo
            );
        });
    });

    describe('Vote Event Handler', () => {
        it('should call voteHandler when vote event is triggered', () => {
            // Arrange
            const votePayload: VotePayload = {
                roomName: 'test-room',
                ticketId: 123,
                vote: 5,
                userSub: 'auth0|test123',
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const voteEventHandler = getEventHandler('vote');

            // Act
            voteEventHandler(votePayload);

            // Assert
            expect(voteHandler).toHaveBeenCalledTimes(1);
            expect(voteHandler).toHaveBeenCalledWith(
                votePayload,
                mockSocket,
                mockIo
            );
        });

        it('should pass correct parameters to voteHandler', () => {
            // Arrange
            const votePayload: VotePayload = {
                roomName: 'poker-session',
                ticketId: 456,
                vote: 8,
                userSub: 'auth0|voter789',
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const voteEventHandler = getEventHandler('vote');

            // Act
            voteEventHandler(votePayload);

            // Assert
            expect(voteHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    roomName: 'poker-session',
                    ticketId: 456,
                    vote: 8,
                    userSub: 'auth0|voter789',
                }),
                mockSocket,
                mockIo
            );
        });
    });

    describe('Show Votes Event Handler', () => {
        it('should call showVotesHandler when showVotes event is triggered', () => {
            // Arrange
            const showVotesPayload: ShowVotesPayload = {
                roomName: 'test-room',
                ticketId: 789,
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const showVotesEventHandler = getEventHandler('showVotes');

            // Act
            showVotesEventHandler(showVotesPayload);

            // Assert
            expect(showVotesHandler).toHaveBeenCalledTimes(1);
            expect(showVotesHandler).toHaveBeenCalledWith(
                showVotesPayload,
                mockSocket,
                mockIo
            );
        });

        it('should pass correct parameters to showVotesHandler', () => {
            // Arrange
            const showVotesPayload: ShowVotesPayload = {
                roomName: 'reveal-room',
                ticketId: 321,
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const showVotesEventHandler = getEventHandler('showVotes');

            // Act
            showVotesEventHandler(showVotesPayload);

            // Assert
            expect(showVotesHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    roomName: 'reveal-room',
                    ticketId: 321,
                }),
                mockSocket,
                mockIo
            );
        });
    });

    describe('Set Estimate Event Handler', () => {
        it('should call setEstimateHandler when setEstimate event is triggered', () => {
            // Arrange
            const setEstimatePayload: SetEstimatePayload = {
                roomName: 'test-room',
                currentTicket: {
                    ticket_id: 456,
                    chosen_estimate: 5,
                    average_vote: 4.5,
                    standard_deviation: 1.2,
                },
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const setEstimateEventHandler = getEventHandler('setEstimate');

            // Act
            setEstimateEventHandler(setEstimatePayload);

            // Assert
            expect(setEstimateHandler).toHaveBeenCalledTimes(1);
            expect(setEstimateHandler).toHaveBeenCalledWith(
                setEstimatePayload,
                mockSocket,
                mockIo
            );
        });

        it('should pass correct parameters to setEstimateHandler', () => {
            // Arrange
            const setEstimatePayload: SetEstimatePayload = {
                roomName: 'estimation-room',
                currentTicket: {
                    ticket_id: 999,
                    chosen_estimate: 13,
                    average_vote: 11.3,
                    standard_deviation: 2.8,
                    extra_field: 'test',
                },
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const setEstimateEventHandler = getEventHandler('setEstimate');

            // Act
            setEstimateEventHandler(setEstimatePayload);

            // Assert
            expect(setEstimateHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    roomName: 'estimation-room',
                    currentTicket: expect.objectContaining({
                        ticket_id: 999,
                        chosen_estimate: 13,
                        average_vote: 11.3,
                        standard_deviation: 2.8,
                        extra_field: 'test',
                    }),
                }),
                mockSocket,
                mockIo
            );
        });
    });

    describe('Handler Isolation', () => {
        it('should only call the specific handler for each event', () => {
            // Arrange
            const joinPayload: JoinPayload = {
                roomName: 'test',
                userSub: 'user1',
            };
            const votePayload: VotePayload = {
                roomName: 'test',
                ticketId: 1,
                vote: 5,
                userSub: 'user1',
            };

            sockets(mockSocket as Socket, mockIo as IOServer);

            const joinEventHandler = getEventHandler('join');
            const voteEventHandler = getEventHandler('vote');

            // Act - trigger join event
            joinEventHandler(joinPayload);

            // Assert - only joinHandler should be called
            expect(joinHandler).toHaveBeenCalledTimes(1);
            expect(voteHandler).not.toHaveBeenCalled();
            expect(showVotesHandler).not.toHaveBeenCalled();
            expect(setEstimateHandler).not.toHaveBeenCalled();

            // Reset mocks
            vi.clearAllMocks();

            // Act - trigger vote event
            voteEventHandler(votePayload);

            // Assert - only voteHandler should be called
            expect(voteHandler).toHaveBeenCalledTimes(1);
            expect(joinHandler).not.toHaveBeenCalled();
            expect(showVotesHandler).not.toHaveBeenCalled();
            expect(setEstimateHandler).not.toHaveBeenCalled();
        });
    });

    describe('Multiple Event Triggers', () => {
        it('should handle multiple events of the same type', () => {
            // Arrange
            const joinPayload1: JoinPayload = {
                roomName: 'room1',
                userSub: 'user1',
            };
            const joinPayload2: JoinPayload = {
                roomName: 'room2',
                userSub: 'user2',
            };

            sockets(mockSocket as Socket, mockIo as IOServer);
            const joinEventHandler = getEventHandler('join');

            // Act
            joinEventHandler(joinPayload1);
            joinEventHandler(joinPayload2);

            // Assert
            expect(joinHandler).toHaveBeenCalledTimes(2);
            expect(joinHandler).toHaveBeenNthCalledWith(
                1,
                joinPayload1,
                mockSocket,
                mockIo
            );
            expect(joinHandler).toHaveBeenNthCalledWith(
                2,
                joinPayload2,
                mockSocket,
                mockIo
            );
        });

        it('should handle mixed event types in sequence', () => {
            // Arrange
            const joinPayload: JoinPayload = {
                roomName: 'test',
                userSub: 'user1',
            };
            const votePayload: VotePayload = {
                roomName: 'test',
                ticketId: 1,
                vote: 5,
                userSub: 'user1',
            };
            const showVotesPayload: ShowVotesPayload = {
                roomName: 'test',
                ticketId: 1,
            };

            sockets(mockSocket as Socket, mockIo as IOServer);

            const joinEventHandler = getEventHandler('join');
            const voteEventHandler = getEventHandler('vote');
            const showVotesEventHandler = getEventHandler('showVotes');

            // Act
            joinEventHandler(joinPayload);
            voteEventHandler(votePayload);
            showVotesEventHandler(showVotesPayload);

            // Assert
            expect(joinHandler).toHaveBeenCalledTimes(1);
            expect(voteHandler).toHaveBeenCalledTimes(1);
            expect(showVotesHandler).toHaveBeenCalledTimes(1);
            expect(setEstimateHandler).not.toHaveBeenCalled();
        });
    });
});
