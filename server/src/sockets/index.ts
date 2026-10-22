import type { Server } from 'socket.io';

import { socketAuth } from '../middleware/socketAuth.js';
import { registerArchiveHandler } from './handlers/archiveHandler.js';
import { registerFacilitatorsHandler } from './handlers/facilitatorsHandler.js';
import { registerJoinHandler } from './handlers/joinHandler.js';
import { registerPresenceHandler } from './handlers/presenceHandler.js';
import { registerRevoteHandler } from './handlers/revoteHandler.js';
import { registerSelectTicketHandler } from './handlers/selectTicketHandler.js';
import { registerSetEstimateHandler } from './handlers/setEstimateHandler.js';
import { registerShowVotesHandler } from './handlers/showVotesHandler.js';
import { registerTimerHandler } from './handlers/timerHandler.js';
import { registerVoteHandler } from './handlers/voteHandler.js';

const handlers = [
    registerJoinHandler,
    registerVoteHandler,
    registerShowVotesHandler,
    registerSetEstimateHandler,
    registerPresenceHandler,
    registerSelectTicketHandler,
    registerRevoteHandler,
    registerTimerHandler,
    registerFacilitatorsHandler,
    registerArchiveHandler,
];

export const registerSockets = (io: Server) => {
    io.use(socketAuth);
    io.on('connection', (socket) => {
        console.log('a user connected');
        handlers.forEach((register) => register(socket, io));
    });
};
