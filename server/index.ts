import { createServer } from 'http';
import { Server } from 'socket.io';

import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { registerSockets } from './src/sockets/index.js';

process.on('uncaughtException', (error) => {
    console.log(error.stack);
});

const app = createApp();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

registerSockets(io);

server.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
});
