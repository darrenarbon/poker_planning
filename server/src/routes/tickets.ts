import { Router, Request, Response } from 'express';
import { returnError } from './routeHelper';
import { checkJwt } from '../services/authService';
import { deleteTicketById } from '../services/ticketsService';

const ticketRouter = Router();

ticketRouter.delete(
    '/:ticketId',
    checkJwt,
    async (req: Request, res: Response) => {
        try {
            const { ticketId } = req.params;

            if (!ticketId) {
                return returnError(res, 400, null, 'Ticket ID is required');
            }

            const result = await deleteTicketById(ticketId);

            if (!result.success) {
                return returnError(
                    res,
                    result.status || 500,
                    result.error,
                    result.message || 'Error deleting ticket'
                );
            }

            return res.json({
                message: result.data?.message || 'Ticket deleted',
            });
        } catch (error) {
            return returnError(
                res,
                500,
                error,
                'Internal server error',
                'Unhandled error in delete ticket route:'
            );
        }
    }
);

export default ticketRouter;
