import { Router, Request, Response } from 'express';
import { returnError } from './routeHelper';
import { checkJwt } from '../services/authService';
import { getUserRooms } from '../services/userService';

const userRouter = Router();

/**
 * GET /users/:userSub/rooms
 * Fetches all rooms administered by a specific user
 */
userRouter.get(
    '/:userSub/rooms',
    checkJwt,
    async (req: Request, res: Response) => {
        try {
            const { userSub } = req.params;

            // Validate input
            if (!userSub || typeof userSub !== 'string') {
                return returnError(res, 400, null, 'Valid user ID is required');
            }

            // Use service to get user rooms
            const result = await getUserRooms(userSub);

            if (!result.success) {
                const statusCode =
                    result.message === 'User not found' ? 404 : 500;
                return returnError(
                    res,
                    statusCode,
                    result.error,
                    result.message || 'Error fetching rooms'
                );
            }

            return res.status(200).json({
                rooms: result.rooms,
                count: result.rooms?.length || 0,
            });
        } catch (error) {
            console.error('Unhandled error in getUserRooms route:', error);
            return returnError(res, 500, error, 'Internal server error');
        }
    }
);

export default userRouter;
