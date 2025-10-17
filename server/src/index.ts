import express, { json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import 'dotenv/config';

import routes from './routes';
import sockets from './sockets';

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
    origin: process.env.FRONT_END_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'X-HTTP-Method-Override',
        'Content-Type',
        'Accept',
        'Authorization',
    ],
};
app.use(cors(corsOptions));

app.use(json());

app.use('/', routes);

io.on('connection', (socket) => {
    console.log('a user connected');
    sockets(socket, io);
});

server.listen(process.env.PORT_NUMBER || 10000, () => {
    console.log(
        `Server is running on port ${process.env.PORT_NUMBER || 10000}`
    );
});
