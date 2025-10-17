import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    handleVote,
    type VoteResult,
} from '../../../../src/sockets/services/socketVoteService';
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

describe('socketVoteService', () => {
    let mockFindUserByAuth0Sub: Mock;
    let mockFindExistingVote: Mock;
    let mockUpdateVote: Mock;
    let mockInsertVote: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup database utility mocks
        mockFindUserByAuth0Sub = vi.fn();
        mockFindExistingVote = vi.fn();
        mockUpdateVote = vi.fn();
        mockInsertVote = vi.fn();

        // Apply mocks
        (socketDatabase.findUserByAuth0Sub as Mock) = mockFindUserByAuth0Sub;
        (socketDatabase.findExistingVote as Mock) = mockFindExistingVote;
        (socketDatabase.updateVote as Mock) = mockUpdateVote;
        (socketDatabase.insertVote as Mock) = mockInsertVote;
    });

    describe('handleVote', () => {
        describe('successful voting', () => {
            it('should successfully create a new vote when no existing vote exists', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                // Mock successful user lookup
                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                // Mock no existing vote
                mockFindExistingVote.mockResolvedValue({
                    data: [],
                    error: null,
                });

                // Mock successful vote insertion
                mockInsertVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockFindUserByAuth0Sub).toHaveBeenCalledWith(
                    'auth0|test123'
                );
                expect(mockFindExistingVote).toHaveBeenCalledWith(123, 1);
                expect(mockInsertVote).toHaveBeenCalledWith(123, 5, 1);
                expect(mockUpdateVote).not.toHaveBeenCalled();
            });

            it('should successfully update an existing vote', async () => {
                const ticketId = 123;
                const vote = 8;
                const userSub = 'auth0|test123';

                // Mock successful user lookup
                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                // Mock existing vote
                mockFindExistingVote.mockResolvedValue({
                    data: [
                        { vote_id: 456, ticket_id: 123, user_id: 1, vote: 5 },
                    ],
                    error: null,
                });

                // Mock successful vote update
                mockUpdateVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockFindUserByAuth0Sub).toHaveBeenCalledWith(
                    'auth0|test123'
                );
                expect(mockFindExistingVote).toHaveBeenCalledWith(123, 1);
                expect(mockUpdateVote).toHaveBeenCalledWith(456, 8);
                expect(mockInsertVote).not.toHaveBeenCalled();
            });

            it('should handle vote with zero value', async () => {
                const ticketId = 123;
                const vote = 0;
                const userSub = 'auth0|test123';

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('No vote was submitted');
                expect(mockFindUserByAuth0Sub).not.toHaveBeenCalled();
            });

            it('should handle large vote values', async () => {
                const ticketId = 123;
                const vote = 999999;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockInsertVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockInsertVote).toHaveBeenCalledWith(123, 999999, 1);
            });
        });

        describe('validation errors', () => {
            it('should handle missing vote value', async () => {
                const ticketId = 123;
                const vote = null as any;
                const userSub = 'auth0|test123';

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('No vote was submitted');
            });

            it('should handle undefined vote value', async () => {
                const ticketId = 123;
                const vote = undefined as any;
                const userSub = 'auth0|test123';

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('No vote was submitted');
            });

            it('should handle false vote value (treated as no vote)', async () => {
                const ticketId = 123;
                const vote = false as any;
                const userSub = 'auth0|test123';

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('No vote was submitted');
            });
        });

        describe('user lookup errors', () => {
            it('should handle user lookup database error', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: null,
                    error: new Error('Database connection failed'),
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting user');
            });

            it('should handle user not found', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|nonexistent';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [],
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBe(null);
                expect(result.message).toBe('User not found');
            });

            it('should handle null user data', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('User not found');
            });
        });

        describe('existing vote lookup errors', () => {
            it('should handle error checking for existing vote', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: null,
                    error: new Error('Vote lookup failed'),
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting existing vote');
            });
        });

        describe('vote update errors', () => {
            it('should handle error updating existing vote', async () => {
                const ticketId = 123;
                const vote = 8;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: [
                        { vote_id: 456, ticket_id: 123, user_id: 1, vote: 5 },
                    ],
                    error: null,
                });

                mockUpdateVote.mockResolvedValue({
                    error: new Error('Failed to update vote'),
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error updating vote');
            });
        });

        describe('vote insertion errors', () => {
            it('should handle error inserting new vote', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockInsertVote.mockResolvedValue({
                    error: new Error('Failed to insert vote'),
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error inserting vote');
            });
        });

        describe('unexpected errors', () => {
            it('should handle unexpected errors during execution', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockImplementation(() => {
                    throw new Error('Unexpected database error');
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Unexpected error during voting');
            });
        });

        describe('edge cases', () => {
            it('should handle negative vote values', async () => {
                const ticketId = 123;
                const vote = -1;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockInsertVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockInsertVote).toHaveBeenCalledWith(123, -1, 1);
            });

            it('should handle large ticket IDs', async () => {
                const ticketId = 999999999;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockInsertVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockFindExistingVote).toHaveBeenCalledWith(999999999, 1);
                expect(mockInsertVote).toHaveBeenCalledWith(999999999, 5, 1);
            });

            it('should handle special characters in userSub', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|user-@#$%^&*()';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|user-@#$%^&*()',
                            name: 'Special User',
                        },
                    ],
                    error: null,
                });

                mockFindExistingVote.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockInsertVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockFindUserByAuth0Sub).toHaveBeenCalledWith(
                    'auth0|user-@#$%^&*()'
                );
            });

            it('should handle updating vote to same value', async () => {
                const ticketId = 123;
                const vote = 5;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                // Mock existing vote with same value
                mockFindExistingVote.mockResolvedValue({
                    data: [
                        { vote_id: 456, ticket_id: 123, user_id: 1, vote: 5 },
                    ],
                    error: null,
                });

                mockUpdateVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockUpdateVote).toHaveBeenCalledWith(456, 5);
            });

            it('should handle multiple existing votes (take first one)', async () => {
                const ticketId = 123;
                const vote = 8;
                const userSub = 'auth0|test123';

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|test123',
                            name: 'Test User',
                        },
                    ],
                    error: null,
                });

                // Mock multiple existing votes (edge case)
                mockFindExistingVote.mockResolvedValue({
                    data: [
                        { vote_id: 456, ticket_id: 123, user_id: 1, vote: 5 },
                        { vote_id: 789, ticket_id: 123, user_id: 1, vote: 7 },
                    ],
                    error: null,
                });

                mockUpdateVote.mockResolvedValue({
                    error: null,
                });

                const result: VoteResult = await handleVote(
                    ticketId,
                    vote,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockUpdateVote).toHaveBeenCalledWith(456, 8); // Should use first vote_id
            });
        });
    });
});
