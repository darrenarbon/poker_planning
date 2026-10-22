import { Router } from 'express';

import { errorHandler } from '../utils/errors.js';
import authRoutes from './authRoutes.js';
import jiraRoutes from './jiraRoutes.js';
import roomRoutes from './roomRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import ticketRoutes from './ticketRoutes.js';

const router = Router();

router.use(authRoutes);
router.use(jiraRoutes);
router.use(ticketRoutes);
router.use(roomRoutes);
router.use(settingsRoutes);

router.get('*', (_req, res) => {
    res.send('Sorry, page not found... What are you doing with your life?');
});

router.use(errorHandler);

export default router;
