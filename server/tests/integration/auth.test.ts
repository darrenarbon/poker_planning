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
            insert: vi.fn(),
        })),
    },
}));

// Mock the route helper functions - no external variable references
vi.mock('../../src/routes/routeHelper', () => ({
    getUserDetails: vi.fn(),
    returnError: vi.fn(),
}));

import authRouter from '../../src/routes/auth';
import { supabaseConnection } from '../../src/database';
import { getUserDetails, returnError } from '../../src/routes/routeHelper';

const app = express();
app.use(json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations
        (getUserDetails as Mock).mockReset();
        (returnError as Mock).mockReset();
    });

    describe('POST /auth/login', () => {
        const validUserData = {
            user: {
                sub: 'auth0|123456789',
                email: 'test@example.com',
                given_name: 'John',
                family_name: 'Doe',
                nickname: 'johndoe',
                picture: 'https://example.com/avatar.jpg',
            },
        };

        it('should return 200 for existing user without creating new record', async () => {
            // Mock existing user
            (getUserDetails as Mock).mockResolvedValue({
                id: 1,
                auth0_sub: 'auth0|123456789',
                email: 'test@example.com',
            });

            const response = await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(200);

            expect(response.body).toEqual({
                isNewUser: false,
                message: 'User logged in successfully',
                user: {
                    email: 'test@example.com',
                    id: 1,
                    name: 'test@example.com',
                },
            });
            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should create new user and return 200 when user does not exist', async () => {
            // Mock no existing user
            (getUserDetails as Mock).mockResolvedValue(null);

            // Mock successful insert
            const mockInsert = vi.fn().mockResolvedValue({
                error: null,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const response = await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(200);

            expect(response.body).toEqual({
                isNewUser: true,
                message: 'User created successfully',
                user: {},
            });
            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
            expect(supabaseConnection.from).toHaveBeenCalledWith('user');
            expect(mockInsert).toHaveBeenCalledWith({
                auth0_sub: 'auth0|123456789',
                email: 'test@example.com',
                given_name: 'John',
                family_name: 'Doe',
                nickname: 'johndoe',
                picture: 'https://example.com/avatar.jpg',
            });
        });

        it('should handle database error during user creation', async () => {
            // Mock no existing user
            (getUserDetails as Mock).mockResolvedValue(null);

            // Mock database error during insert
            const mockInsert = vi.fn().mockResolvedValue({
                error: { message: 'Database insert failed' },
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            // Mock the returnError function to return a response
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(500);

            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
            expect(supabaseConnection.from).toHaveBeenCalledWith('user');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                { message: 'Database insert failed' },
                'Error creating user'
            );
        });

        it('should handle getUserDetails error', async () => {
            // Mock getUserDetails throwing an error
            (getUserDetails as Mock).mockRejectedValue(
                new Error('Database connection failed')
            );

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(500);

            expect(getUserDetails).toHaveBeenCalledWith('auth0|123456789');
            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                expect.any(Error),
                'Internal server error during login'
            );
        });

        it('should handle missing request body', async () => {
            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app).post('/auth/login').expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                null,
                'User data is required'
            );
        });

        it('should handle missing user object in request body', async () => {
            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/auth/login')
                .send({})
                .expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                null,
                'User data is required'
            );
        });

        it('should handle invalid user data format', async () => {
            const invalidUserData = {
                user: {
                    // Missing required sub and email fields
                    given_name: 'John',
                    family_name: 'Doe',
                },
            };

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            const response = await request(app)
                .post('/auth/login')
                .send(invalidUserData)
                .expect(400);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                400,
                null,
                'Invalid user data format. Required fields: sub, email'
            );
        });

        it('should handle partial user data', async () => {
            const partialUserData = {
                user: {
                    sub: 'auth0|123456789',
                    email: 'test@example.com',
                    // Missing other fields
                },
            };

            // Mock no existing user
            (getUserDetails as Mock).mockResolvedValue(null);

            // Mock successful insert
            const mockInsert = vi.fn().mockResolvedValue({
                error: null,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            const response = await request(app)
                .post('/auth/login')
                .send(partialUserData)
                .expect(200);

            expect(mockInsert).toHaveBeenCalledWith({
                auth0_sub: 'auth0|123456789',
                email: 'test@example.com',
                given_name: undefined,
                family_name: undefined,
                nickname: undefined,
                picture: undefined,
            });
        });

        it('should handle malformed JSON in request body', async () => {
            const response = await request(app)
                .post('/auth/login')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });

        it('should extract user fields correctly', async () => {
            const userWithExtraFields = {
                user: {
                    sub: 'auth0|123456789',
                    email: 'test@example.com',
                    given_name: 'John',
                    family_name: 'Doe',
                    nickname: 'johndoe',
                    picture: 'https://example.com/avatar.jpg',
                    // Extra fields that should be ignored
                    extraField: 'should be ignored',
                    anotherField: 123,
                },
            };

            // Mock no existing user
            (getUserDetails as Mock).mockResolvedValue(null);

            // Mock successful insert
            const mockInsert = vi.fn().mockResolvedValue({
                error: null,
            });

            (supabaseConnection.from as Mock).mockReturnValue({
                insert: mockInsert,
            });

            await request(app)
                .post('/auth/login')
                .send(userWithExtraFields)
                .expect(200);

            // Verify only expected fields are passed to insert
            expect(mockInsert).toHaveBeenCalledWith({
                auth0_sub: 'auth0|123456789',
                email: 'test@example.com',
                given_name: 'John',
                family_name: 'Doe',
                nickname: 'johndoe',
                picture: 'https://example.com/avatar.jpg',
            });

            // Verify extra fields are not included
            expect(mockInsert).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    extraField: expect.anything(),
                    anotherField: expect.anything(),
                })
            );
        });
    });
});
