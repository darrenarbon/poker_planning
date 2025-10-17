import { Router, Request, Response } from 'express';
import { returnError } from './routeHelper';
import { checkJwt } from '../services/authService';
import {
    createRoom,
    addTicketsToRoom,
    addSingleTicketToRoom,
    getRoomDetails,
} from '../services/roomService';
import {
    CreateRoomRequest,
    AddTicketsRequest,
    AddSingleTicketRequest,
} from '../types/room';

const roomRouter = Router();

roomRouter.post('/', checkJwt, async (req: Request, res: Response) => {
    try {
        const { roomName, baseUrl }: CreateRoomRequest = req.body;

        if (!req.auth || !req.auth.payload) {
            return returnError(
                res,
                401,
                null,
                'Unauthorized: Missing authentication payload'
            );
        }

        const authPayload = req.auth.payload;
        if (!authPayload.sub) {
            return returnError(
                res,
                400,
                null,
                'Invalid authentication payload: missing sub'
            );
        }

        const result = await createRoom(roomName, baseUrl, authPayload.sub);

        if (!result.success) {
            return returnError(
                res,
                result.status || 500,
                result.error,
                result.message || 'Error creating room'
            );
        }

        return res.json({ roomId: result.data?.roomId });
    } catch (error) {
        console.error('Error in POST /rooms:', error);
        return returnError(
            res,
            500,
            error,
            'Internal server error',
            'Unhandled error in newroom route:'
        );
    }
});

// for a single ticket this uses room name, so the front end will need to be aware
roomRouter.post(
    '/:roomId/tickets',
    checkJwt,
    async (req: Request, res: Response) => {
        try {
            const { roomId } = req.params;
            const { ticketsToSave }: AddTicketsRequest = req.body;

            const result = await addTicketsToRoom(roomId, ticketsToSave);

            if (!result.success) {
                return returnError(
                    res,
                    result.status || 500,
                    result.error,
                    result.message || 'Error adding tickets'
                );
            }

            return res.json({ message: result.data?.message });
        } catch (error) {
            return returnError(
                res,
                500,
                error,
                'Internal server error',
                'Unhandled error in add tickets route:'
            );
        }
    }
);

// this route needs combining with the above route
// room name should be room id
roomRouter.post(
    '/:roomId/ticket',
    checkJwt,
    async (req: Request, res: Response) => {
        try {
            const { roomId } = req.params;
            const { ticketNumber }: AddSingleTicketRequest = req.body;

            const result = await addSingleTicketToRoom(roomId, ticketNumber);

            if (!result.success) {
                return returnError(
                    res,
                    result.status || 500,
                    result.error,
                    result.message || 'Error adding ticket'
                );
            }

            return res.json(result.data);
        } catch (error) {
            return returnError(
                res,
                500,
                error,
                'Internal server error',
                'Unhandled error in add single ticket route:'
            );
        }
    }
);

// this endpoint changed from roomName to roomId
roomRouter.get('/:roomId', checkJwt, async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;

        const result = await getRoomDetails(roomId);

        if (!result.success) {
            return returnError(
                res,
                result.status || 500,
                result.error,
                result.message || 'Error fetching room details'
            );
        }

        return res.json(result.data);
    } catch (error) {
        return returnError(
            res,
            500,
            error,
            'Internal server error',
            'Unhandled error in get room details route:'
        );
    }
});

export default roomRouter;
