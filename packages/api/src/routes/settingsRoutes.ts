import { Router } from 'express';

import * as settingsController from '../controllers/settingsController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get(
    '/me/settings',
    checkJwt,
    asyncHandler(settingsController.getSettings)
);
router.put(
    '/me/settings',
    checkJwt,
    asyncHandler(settingsController.saveSettings)
);

export default router;
