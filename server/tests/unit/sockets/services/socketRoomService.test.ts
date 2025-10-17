import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
    handleJoinRoom,
    type JoinRoomResult,
} from '../../../../src/sockets/services/socketRoomService';
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

describe('socketRoomService', () => {
    let mockFindRoomByName: Mock;
    let mockFindUserByAuth0Sub: Mock;
    let mockFindUserInRoom: Mock;
    let mockAddUserToRoom: Mock;
    let mockGetUsersInRoom: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup database utility mocks
        mockFindRoomByName = vi.fn();
        mockFindUserByAuth0Sub = vi.fn();
        mockFindUserInRoom = vi.fn();
        mockAddUserToRoom = vi.fn();
        mockGetUsersInRoom = vi.fn();

        // Apply mocks
        (socketDatabase.findRoomByName as Mock) = mockFindRoomByName;
        (socketDatabase.findUserByAuth0Sub as Mock) = mockFindUserByAuth0Sub;
        (socketDatabase.findUserInRoom as Mock) = mockFindUserInRoom;
        (socketDatabase.addUserToRoom as Mock) = mockAddUserToRoom;
        (socketDatabase.getUsersInRoom as Mock) = mockGetUsersInRoom;
    });

    describe('handleJoinRoom', () => {
        describe('successful room joining', () => {
            it('should successfully join a user to a room when user is not already in room', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                // Mock successful room lookup
                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

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

                // Mock user not in room
                mockFindUserInRoom.mockResolvedValue({
                    data: [],
                    error: null,
                });

                // Mock successful user addition to room
                mockAddUserToRoom.mockResolvedValue({
                    error: null,
                });

                // Mock getting users in room
                mockGetUsersInRoom.mockResolvedValue({
                    data: [
                        {
                            user: {
                                user_id: 1,
                                auth0_sub: 'auth0|test123',
                                name: 'Test User',
                            },
                        },
                    ],
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(result.users).toEqual([
                    {
                        user_id: 1,
                        auth0_sub: 'auth0|test123',
                        name: 'Test User',
                    },
                ]);
                expect(mockFindRoomByName).toHaveBeenCalledWith('test-room');
                expect(mockFindUserByAuth0Sub).toHaveBeenCalledWith(
                    'auth0|test123'
                );
                expect(mockFindUserInRoom).toHaveBeenCalledWith(1, 1);
                expect(mockAddUserToRoom).toHaveBeenCalledWith(1, 1);
                expect(mockGetUsersInRoom).toHaveBeenCalledWith(1);
            });

            it('should successfully join when user is already in room', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                // Mock successful room lookup
                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

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

                // Mock user already in room
                mockFindUserInRoom.mockResolvedValue({
                    data: [{ user_id: 1, room_id: 1 }],
                    error: null,
                });

                // Mock getting users in room
                mockGetUsersInRoom.mockResolvedValue({
                    data: [
                        {
                            user: {
                                user_id: 1,
                                auth0_sub: 'auth0|test123',
                                name: 'Test User',
                            },
                        },
                    ],
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(result.users).toEqual([
                    {
                        user_id: 1,
                        auth0_sub: 'auth0|test123',
                        name: 'Test User',
                    },
                ]);
                expect(mockAddUserToRoom).not.toHaveBeenCalled(); // Should not add user if already in room
            });

            it('should handle empty users in room', async () => {
                const roomName = 'empty-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'empty-room' }],
                    error: null,
                });

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

                mockFindUserInRoom.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockAddUserToRoom.mockResolvedValue({
                    error: null,
                });

                // Mock empty users in room
                mockGetUsersInRoom.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(result.users).toEqual([]);
            });
        });

        describe('room lookup errors', () => {
            it('should handle room lookup database error', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: null,
                    error: new Error('Database connection failed'),
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting room');
                expect(mockFindUserByAuth0Sub).not.toHaveBeenCalled();
            });

            it('should handle room not found', async () => {
                const roomName = 'nonexistent-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [],
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBe(null);
                expect(result.message).toBe('Room not found');
            });

            it('should handle null room data', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('Room not found');
            });
        });

        describe('user lookup errors', () => {
            it('should handle user lookup database error', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: null,
                    error: new Error('User database error'),
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting user');
            });

            it('should handle user not found', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|nonexistent';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [],
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('User not found');
            });

            it('should handle null user data', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: null,
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.message).toBe('User not found');
            });
        });

        describe('user in room lookup errors', () => {
            it('should handle error checking if user is in room', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

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

                mockFindUserInRoom.mockResolvedValue({
                    data: null,
                    error: new Error('User in room lookup failed'),
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting user in room');
            });
        });

        describe('adding user to room errors', () => {
            it('should handle error adding user to room', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

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

                mockFindUserInRoom.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockAddUserToRoom.mockResolvedValue({
                    error: new Error('Failed to add user to room'),
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error adding user to room');
            });
        });

        describe('getting users in room errors', () => {
            it('should handle error getting users in room', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room' }],
                    error: null,
                });

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

                mockFindUserInRoom.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockAddUserToRoom.mockResolvedValue({
                    error: null,
                });

                mockGetUsersInRoom.mockResolvedValue({
                    data: null,
                    error: new Error('Failed to get users in room'),
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe('Error getting users in room');
            });
        });

        describe('unexpected errors', () => {
            it('should handle unexpected errors during execution', async () => {
                const roomName = 'test-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockImplementation(() => {
                    throw new Error('Unexpected database error');
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(false);
                expect(result.error).toBeInstanceOf(Error);
                expect(result.message).toBe(
                    'Unexpected error during room join'
                );
            });
        });

        describe('edge cases', () => {
            it('should handle multiple users in room', async () => {
                const roomName = 'busy-room';
                const userSub = 'auth0|test123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'busy-room' }],
                    error: null,
                });

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

                mockFindUserInRoom.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockAddUserToRoom.mockResolvedValue({
                    error: null,
                });

                mockGetUsersInRoom.mockResolvedValue({
                    data: [
                        { user: { user_id: 1, name: 'User 1' } },
                        { user: { user_id: 2, name: 'User 2' } },
                        { user: { user_id: 3, name: 'User 3' } },
                    ],
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(result.users).toHaveLength(3);
                expect(result.users).toEqual([
                    { user_id: 1, name: 'User 1' },
                    { user_id: 2, name: 'User 2' },
                    { user_id: 3, name: 'User 3' },
                ]);
            });

            it('should handle room names with special characters', async () => {
                const roomName = 'test-room-@#$%^&*()';
                const userSub = 'auth0|special-user-123';

                mockFindRoomByName.mockResolvedValue({
                    data: [{ room_id: 1, room_name: 'test-room-@#$%^&*()' }],
                    error: null,
                });

                mockFindUserByAuth0Sub.mockResolvedValue({
                    data: [
                        {
                            user_id: 1,
                            auth0_sub: 'auth0|special-user-123',
                            name: 'Special User',
                        },
                    ],
                    error: null,
                });

                mockFindUserInRoom.mockResolvedValue({
                    data: [],
                    error: null,
                });

                mockAddUserToRoom.mockResolvedValue({
                    error: null,
                });

                mockGetUsersInRoom.mockResolvedValue({
                    data: [
                        {
                            user: {
                                user_id: 1,
                                auth0_sub: 'auth0|special-user-123',
                                name: 'Special User',
                            },
                        },
                    ],
                    error: null,
                });

                const result: JoinRoomResult = await handleJoinRoom(
                    roomName,
                    userSub
                );

                expect(result.success).toBe(true);
                expect(mockFindRoomByName).toHaveBeenCalledWith(
                    'test-room-@#$%^&*()'
                );
                expect(mockFindUserByAuth0Sub).toHaveBeenCalledWith(
                    'auth0|special-user-123'
                );
            });
        });
    });
});
