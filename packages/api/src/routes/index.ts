import { Router } from 'express';

import { planningPokerRouter } from '../apps/planningPoker/index.js';
import { errorHandler } from '../utils/errors.js';
import authRoutes from './authRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import jiraRoutes from './jiraRoutes.js';
import profileRoutes from './profileRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import teamRoutes from './teamRoutes.js';

const router = Router();

// shared by every app
router.use(authRoutes);
router.use(jiraRoutes);
router.use(settingsRoutes);
router.use(profileRoutes);
router.use(teamRoutes);
router.use(holidayRoutes);

// each app's own endpoints
router.use(planningPokerRouter);

router.get('*', (_req, res) => {
    res.send('Sorry, page not found... What are you doing with your life?');
});

router.use(errorHandler);

export default router;
