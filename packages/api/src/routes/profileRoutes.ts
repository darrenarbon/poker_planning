import { Router } from 'express';

import * as profileController from '../controllers/profileController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get('/me/profile', checkJwt, asyncHandler(profileController.getProfile));
router.put(
    '/me/profile',
    checkJwt,
    asyncHandler(profileController.saveProfile)
);

export default router;
