import { Router } from 'express';

import * as authController from '../controllers/authController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.post('/login', checkJwt, asyncHandler(authController.login));

export default router;
