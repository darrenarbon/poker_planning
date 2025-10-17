import { Router, Response } from 'express';
import { returnError } from './routeHelper';
import { handleUserLogin, validateUserData } from '../services/authService';
import { LoginRequest } from '../types/auth';

const authRouter = Router();

authRouter.post('/login', async (req: LoginRequest, res: Response) => {
    try {
        // Validate request body
        if (!req.body || !req.body.user) {
            return returnError(res, 400, null, 'User data is required');
        }

        const userData = req.body.user;

        // Validate user data structure
        if (!validateUserData(userData)) {
            return returnError(
                res,
                400,
                null,
                'Invalid user data format. Required fields: sub, email'
            );
        }

        // Handle the login flow
        const result = await handleUserLogin(userData);

        if (!result.success) {
            return returnError(
                res,
                500,
                result.error,
                result.message || 'Login failed'
            );
        }

        // Return success response with user info
        return res.status(200).json({
            message: result.isNewUser
                ? 'User created successfully'
                : 'User logged in successfully',
            user: {
                id: result.user?.id,
                email: result.user?.email,
                name:
                    result.user?.given_name && result.user?.family_name
                        ? `${result.user.given_name} ${result.user.family_name}`
                        : result.user?.nickname || result.user?.email,
            },
            isNewUser: result.isNewUser,
        });
    } catch (error) {
        return returnError(
            res,
            500,
            error,
            'Internal server error',
            'Unhandled error in login route:'
        );
    }
});

export default authRouter;
