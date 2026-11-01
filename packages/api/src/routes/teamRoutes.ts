import { Router } from 'express';

import * as teamController from '../controllers/teamController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

router.get('/me/teams', checkJwt, asyncHandler(teamController.getMyTeams));
router.post('/teams', checkJwt, asyncHandler(teamController.createTeam));
router.get('/teams/:teamId', checkJwt, asyncHandler(teamController.getTeam));
router.put('/teams/:teamId', checkJwt, asyncHandler(teamController.renameTeam));
router.delete(
    '/teams/:teamId',
    checkJwt,
    asyncHandler(teamController.deleteTeam)
);

router.post(
    '/teams/:teamId/members',
    checkJwt,
    asyncHandler(teamController.addMember)
);
router.put(
    '/teams/:teamId/members/:userId',
    checkJwt,
    asyncHandler(teamController.changeMemberRole)
);
router.delete(
    '/teams/:teamId/members/:userId',
    checkJwt,
    asyncHandler(teamController.removeMember)
);
router.post(
    '/teams/:teamId/owner',
    checkJwt,
    asyncHandler(teamController.transferOwnership)
);

router.get(
    '/teams/:teamId/invites',
    checkJwt,
    asyncHandler(teamController.getInvites)
);
router.post(
    '/teams/:teamId/invites',
    checkJwt,
    asyncHandler(teamController.createInvite)
);
router.delete(
    '/teams/:teamId/invites/:inviteId',
    checkJwt,
    asyncHandler(teamController.revokeInvite)
);

router.get(
    '/invites/:token',
    checkJwt,
    asyncHandler(teamController.previewInvite)
);
router.post(
    '/invites/:token/accept',
    checkJwt,
    asyncHandler(teamController.acceptInvite)
);

export default router;
