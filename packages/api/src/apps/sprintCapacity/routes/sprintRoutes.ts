import { Router } from 'express';

import { checkJwt } from '../../../middleware/checkJwt.js';
import { asyncHandler } from '../../../utils/errors.js';
import * as sprintController from '../controllers/sprintController.js';

const router = Router();

router.get(
    '/teams/:teamId/sprints',
    checkJwt,
    asyncHandler(sprintController.getSprints)
);
router.post(
    '/teams/:teamId/sprints',
    checkJwt,
    asyncHandler(sprintController.createSprint)
);
// before :sprintId, which would otherwise take "forecast" for an id
router.get(
    '/teams/:teamId/sprints/forecast',
    checkJwt,
    asyncHandler(sprintController.getForecast)
);
router.get(
    '/teams/:teamId/sprints/:sprintId',
    checkJwt,
    asyncHandler(sprintController.getSprint)
);
router.put(
    '/teams/:teamId/sprints/:sprintId',
    checkJwt,
    asyncHandler(sprintController.updateSprint)
);
router.delete(
    '/teams/:teamId/sprints/:sprintId',
    checkJwt,
    asyncHandler(sprintController.deleteSprint)
);
router.post(
    '/teams/:teamId/sprints/:sprintId/start',
    checkJwt,
    asyncHandler(sprintController.startSprint)
);
router.post(
    '/teams/:teamId/sprints/:sprintId/close',
    checkJwt,
    asyncHandler(sprintController.closeSprint)
);

export default router;
