import { Router } from 'express';

import * as holidayController from '../controllers/holidayController.js';
import { checkJwt } from '../middleware/checkJwt.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// your own holidays, and the same under /users/:userId for acting on behalf
// of someone else (allowed for super admins and owners/admins of their team)
for (const base of ['/me/holidays', '/users/:userId/holidays']) {
    router.get(base, checkJwt, asyncHandler(holidayController.getHolidays));
    router.post(base, checkJwt, asyncHandler(holidayController.addHoliday));
    router.post(
        `${base}/bank-holidays`,
        checkJwt,
        asyncHandler(holidayController.importBankHolidays)
    );
    router.put(
        `${base}/:holidayId`,
        checkJwt,
        asyncHandler(holidayController.updateHoliday)
    );
    router.delete(
        `${base}/:holidayId`,
        checkJwt,
        asyncHandler(holidayController.deleteHoliday)
    );
}

// who in a team is away for a session at a given time
router.get(
    '/teams/:teamId/absences',
    checkJwt,
    asyncHandler(holidayController.getTeamAbsences)
);

// who in a team has leave coming up
router.get(
    '/teams/:teamId/leave',
    checkJwt,
    asyncHandler(holidayController.getTeamLeave)
);

export default router;
