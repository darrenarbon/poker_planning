import { Router } from 'express';

import * as jiraController from '../controllers/jiraController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.use('/jiraticket', checkJwt);

// Must be registered before /:ticketId so "alltickets" isn't read as an id
router.get(
    '/jiraticket/alltickets',
    asyncHandler(jiraController.getIssuesNeedingEstimates)
);
router.get('/jiraticket/:ticketId', asyncHandler(jiraController.getIssue));
router.post(
    '/jiraticket/:ticketId',
    asyncHandler(jiraController.setStoryPoints)
);

export default router;
