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

// Partially mock the auth Service functions - preserve actual implementations except handleUserLogin
vi.mock('../../src/services/authService', async () => {
    const actual = await vi.importActual('../../src/services/authService');
    return {
        ...actual,
        handleUserLogin: vi.fn(),
    };
});

// Mock the route helper functions - no external variable references
vi.mock('../../src/routes/routeHelper', () => ({
    returnError: vi.fn(),
}));

import authRouter from '../../src/routes/auth';
import { supabaseConnection } from '../../src/database';
import { returnError } from '../../src/routes/routeHelper';
import { handleUserLogin } from '../../src/services/authService';

const app = express();
app.use(json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock implementations
        (handleUserLogin as Mock).mockReset();
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
            (handleUserLogin as Mock).mockResolvedValue({
                success: true,
                user: {
                    id: 1,
                    auth0_sub: 'auth0|123456789',
                    email: 'test@example.com',
                },
                isNewUser: false,
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
            expect(handleUserLogin).toHaveBeenCalledWith(validUserData.user);
            expect(supabaseConnection.from).not.toHaveBeenCalled();
        });

        it('should create new user and return 200 when user does not exist', async () => {
            // Mock no existing user
            (handleUserLogin as Mock).mockResolvedValue({
                success: true,
                user: {
                    id: 1,
                    auth0_sub: 'auth0|123456789',
                    email: 'test@example.com',
                },
                isNewUser: true,
            });

            const response = await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(200);

            expect(response.body).toEqual({
                isNewUser: true,
                message: 'User created successfully',
                user: {
                    id: 1,
                    email: 'test@example.com',
                    name: 'test@example.com',
                },
            });
            expect(handleUserLogin).toHaveBeenCalledWith(validUserData.user);
        });

        it('should handle database error during user creation', async () => {
            // Mock error creating user
            (handleUserLogin as Mock).mockResolvedValue({
                success: false,
                error: {
                    message: 'User creation failed',
                    code: 500,
                },
                message: 'Error creating user',
            });

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(500);

            expect(handleUserLogin).toHaveBeenCalledWith(validUserData.user);

            expect(returnError).toHaveBeenCalledWith(
                expect.anything(),
                500,
                { code: 500, message: 'User creation failed' },
                'Error creating user'
            );
        });

        it('should handle handleUserLogin error', async () => {
            // Mock handleUserLogin throwing an error
            (handleUserLogin as Mock).mockResolvedValue({
                success: false,
                error: new Error('Database connection failed'),
                message: 'Internal server error during login',
            });

            // Mock the returnError function
            (returnError as Mock).mockImplementation(
                (res: any, code: any, error: any, message: any) => {
                    return res.status(code).json({ error: message });
                }
            );

            await request(app)
                .post('/auth/login')
                .send(validUserData)
                .expect(500);

            expect(handleUserLogin).toHaveBeenCalledWith(validUserData.user);
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

            await request(app).post('/auth/login').expect(400);

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

            await request(app).post('/auth/login').send({}).expect(400);

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

            await request(app)
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

            // Mock successful user creation with partial data
            (handleUserLogin as Mock).mockResolvedValue({
                success: true,
                user: {
                    id: 1,
                    auth0_sub: 'auth0|123456789',
                    email: 'test@example.com',
                    given_name: null,
                    family_name: null,
                    nickname: null,
                    picture: null,
                },
                isNewUser: true,
            });

            const response = await request(app)
                .post('/auth/login')
                .send(partialUserData)
                .expect(200);

            expect(response.body).toEqual({
                isNewUser: true,
                message: 'User created successfully',
                user: {
                    id: 1,
                    email: 'test@example.com',
                    name: 'test@example.com',
                },
            });

            expect(handleUserLogin).toHaveBeenCalledWith(partialUserData.user);
        });

        it('should handle malformed JSON in request body', async () => {
            await request(app)
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

            // Mock successful user creation
            (handleUserLogin as Mock).mockResolvedValue({
                success: true,
                user: {
                    id: 1,
                    auth0_sub: 'auth0|123456789',
                    email: 'test@example.com',
                    given_name: 'John',
                    family_name: 'Doe',
                    nickname: 'johndoe',
                    picture: 'https://example.com/avatar.jpg',
                },
                isNewUser: true,
            });

            const response = await request(app)
                .post('/auth/login')
                .send(userWithExtraFields)
                .expect(200);

            expect(response.body).toEqual({
                isNewUser: true,
                message: 'User created successfully',
                user: {
                    id: 1,
                    email: 'test@example.com',
                    name: 'John Doe',
                },
            });

            // Verify handleUserLogin is called with the user object (including extra fields)
            // The route passes the entire user object to handleUserLogin
            expect(handleUserLogin).toHaveBeenCalledWith(
                userWithExtraFields.user
            );
        });
    });
});
