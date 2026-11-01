import { Router } from 'express';

import roomRoutes from './routes/roomRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';

/** Planning poker's REST endpoints */
export const planningPokerRouter = Router();
planningPokerRouter.use(ticketRoutes);
planningPokerRouter.use(roomRoutes);

/** Planning poker's realtime voting */
export { registerSockets as registerPlanningPokerSockets } from './sockets/index.js';
