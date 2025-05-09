/* eslint-disable no-undef */
import express, { json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import 'dotenv/config';

import router from './routes.js';
import sockets from './socket.js';

process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

const app = express();

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const corsOptions = {
    origin: '*',
    credentials: true,
    methods: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(json());

app.use('/', router);

io.on('connection', (socket) => {
    console.log('a user connected');
    sockets(socket, io);
});

server.listen(process.env.PORT_NUMBER || 10000, () => {
    console.log('Server is running on port 3000');
});
