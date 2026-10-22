import { Router } from 'express';

import * as ticketController from '../controllers/ticketController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.delete(
    '/ticket/:ticketId',
    checkJwt,
    asyncHandler(ticketController.deleteTicket)
);

export default router;
