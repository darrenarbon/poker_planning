import { Router } from 'express';

import sprintRoutes from './routes/sprintRoutes.js';

/** Sprint capacity planner's REST endpoints */
export const sprintCapacityRouter = Router();
sprintCapacityRouter.use(sprintRoutes);
