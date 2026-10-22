import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import { socketHandler } from '../../utils/errors.js';
import { getUserSub } from '../guards.js';
import type { JoinPayload } from '../types.js';

export const registerJoinHandler = (socket: Socket, _io: Server) => {
    socket.on(
        'join',
        socketHandler(socket, async ({ roomName }: JoinPayload) => {
            const userSub = getUserSub(socket);
            console.log('join', roomName, userSub);

            // throws for an unknown room, before the socket joins it
            const users = await roomService.joinRoom(roomName, userSub);
            socket.join(roomName);
            socket.to(roomName).emit('userJoined', { users });
        })
    );
};
