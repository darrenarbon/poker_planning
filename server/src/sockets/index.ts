import type { Server } from 'socket.io';

import { registerJoinHandler } from './handlers/joinHandler.js';
import { registerSetEstimateHandler } from './handlers/setEstimateHandler.js';
import { registerShowVotesHandler } from './handlers/showVotesHandler.js';
import { registerVoteHandler } from './handlers/voteHandler.js';

const handlers = [
    registerJoinHandler,
    registerVoteHandler,
    registerShowVotesHandler,
    registerSetEstimateHandler,
];

export const registerSockets = (io: Server) => {
    io.on('connection', (socket) => {
        console.log('a user connected');
        handlers.forEach((register) => register(socket, io));
    });
};
