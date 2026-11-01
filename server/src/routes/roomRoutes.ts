import { Router } from 'express';

import * as roomController from '../controllers/roomController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.post('/newroom', checkJwt, asyncHandler(roomController.createRoom));
router.get('/room/:roomName', checkJwt, asyncHandler(roomController.getRoom));
router.post(
    '/room/:roomName/tickets',
    checkJwt,
    asyncHandler(roomController.addTickets)
);
router.put(
    '/room/:roomName/favourite',
    checkJwt,
    asyncHandler(roomController.setFavourite)
);
router.put(
    '/room/:roomName/hidden',
    checkJwt,
    asyncHandler(roomController.setHidden)
);
router.put(
    '/room/:roomName/baseUrl',
    checkJwt,
    asyncHandler(roomController.updateBaseUrl)
);
router.post(
    '/room/:roomName/newTicket',
    checkJwt,
    asyncHandler(roomController.addTicket)
);
router.get('/me/rooms', checkJwt, asyncHandler(roomController.getRoomsForUser));

export default router;
