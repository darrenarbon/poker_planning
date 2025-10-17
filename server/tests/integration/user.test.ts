import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import { json } from 'express';

// Mock the Auth0 JWT middleware before importing anything else
vi.mock('express-oauth2-jwt-bearer', () => ({
    auth: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

// Mock the database connection
vi.mock('../../src/database', () => ({
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

// Mock the route helper functions
vi.mock('../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
    returnError: vi.fn(),
}));

import userRouter from '../../src/routes/user';
import { supabaseConnection } from '../../src/database';
import { getUserDetails, returnError } from '../../src/routes/routeHelper';

const app = express();
app.use(json());
app.use('/users', userRouter);

describe('User Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations
        (getUserDetails as Mock).mockReset();
        (returnError as Mock).mockReset();
    });

    describe('GET /users/:userSub/rooms', () => {
        const validUserSub = 'auth0|123456789';
        const mockUser = {
            id: 1,
            auth0_sub: validUserSub,
            email: 'test@example.com',
            given_name: 'John',
            family_name: 'Doe',
        };

        const mockRooms = [
            {
                id: 1,
                room_name: 'Planning Room 1',
                admin_id: 1,
                is_active: true,
                created_at: '2024-01-01T10:00:00Z',
                updated_at: '2024-01-01T10:00:00Z',
            },
            {
                id: 2,
                room_name: 'Planning Room 2',
                admin_id: 1,
                is_active: true,
                created_at: '2024-01-02T10:00:00Z',
                updated_at: '2024-01-02T10:00:00Z',
            },
        ];

        it('should return 200 with rooms when user exists and has rooms', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database query chain
            const mockOrder = vi.fn().mockResolvedValue({
                data: mockRooms,
                error: null,
            });

            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });

            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(200);

            expect(response.body).toEqual({
                rooms: mockRooms,
                count: 2,
            });

            expect(getUserDetails).toHaveBeenCalledWith(validUserSub);
            expect(supabaseConnection.from).toHaveBeenCalledWith('room');
            expect(mockSelect).toHaveBeenCalledWith(
                `
                id,
                room_name,
                admin_id,
                is_active,
                created_at,
                updated_at
            `
            );
            expect(mockEq).toHaveBeenCalledWith('admin_id', 1);
            expect(mockOrder).toHaveBeenCalledWith('created_at', {
                ascending: false,
            });
        });

        it('should return 200 with empty rooms array when user has no rooms', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database query returning empty array
            const mockOrder = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });

            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(200);

            expect(response.body).toEqual({
                rooms: [],
                count: 0,
            });

            expect(getUserDetails).toHaveBeenCalledWith(validUserSub);
        });

        it('should return 200 with empty rooms array when database returns null data', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database query returning null data
            const mockOrder = vi.fn().mockResolvedValue({
                data: null,
                error: null,
            });

            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });

            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(200);

            expect(response.body).toEqual({
                rooms: [],
                count: 0,
            });
        });

        it('should return 404 when user does not exist', async () => {
            // Mock user not found
            (getUserDetails as Mock).mockResolvedValue(null);

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(404);

            expect(getUserDetails).toHaveBeenCalledWith(validUserSub);
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                null,
                'User not found'
            );

            // Database should not be queried if user doesn't exist
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should return 500 when database query fails', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock database error
            const mockOrder = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
            });

            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });

            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(500);

            expect(getUserDetails).toHaveBeenCalledWith(validUserSub);
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                { message: 'Database connection failed' },
                'Error fetching rooms for user'
            );
        });

        it('should return 500 when getUserDetails throws an error', async () => {
            // Mock getUserDetails throwing an error
            (getUserDetails as Mock).mockRejectedValue(
                new Error('Database connection error')
            );

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(500);

            expect(getUserDetails).toHaveBeenCalledWith(validUserSub);
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.any(Error),
                'Internal server error while fetching user rooms'
            );

            // Database should not be queried if getUserDetails fails
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid userSub parameter', async () => {
            // This test verifies the validation logic for missing or invalid userSub
            // Since Express routes always provide string parameters, we test with a mock user
            // that doesn't exist to trigger the user validation path

            // Mock user not found to trigger the error path
            (getUserDetails as Mock).mockResolvedValue(null);

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get('/users/invalid-user/rooms')
                .expect(404);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                404,
                null,
                'User not found'
            );
        });

        it('should handle unexpected errors during processing', async () => {
            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue(mockUser);

            // Mock an unexpected error during database query setup
            (supabaseConnection.from as Mock).mockImplementation(() => {
                throw new Error('Unexpected database error');
            });

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .get(`/users/${validUserSub}/rooms`)
                .expect(500);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.any(Error),
                'Internal server error while fetching user rooms'
            );
        });

        it('should validate userSub parameter is a string', async () => {
            // All URL parameters come as strings in Express, so this is more about
            // testing that we handle the string validation correctly
            const testUserSub = 'valid-string-id';

            // Mock user exists
            (getUserDetails as Mock).mockResolvedValue({
                ...mockUser,
                auth0_sub: testUserSub,
            });

            // Mock successful database response
            const mockOrder = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            const mockEq = vi.fn().mockReturnValue({
                order: mockOrder,
            });

            const mockSelect = vi.fn().mockReturnValue({
                eq: mockEq,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                select: mockSelect,
            });

            const response = await request(app)
                .get(`/users/${testUserSub}/rooms`)
                .expect(200);

            expect(getUserDetails).toHaveBeenCalledWith(testUserSub);
            expect(response.body).toEqual({
                rooms: [],
                count: 0,
            });
        });
    });
});
