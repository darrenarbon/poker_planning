import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import { socketHandler } from '../../utils/errors.js';
import type { JoinPayload } from '../types.js';

export const registerJoinHandler = (socket: Socket, _io: Server) => {
    socket.on(
        'join',
        socketHandler(socket, async ({ roomName, userSub }: JoinPayload) => {
            if (!userSub) return;
            console.log('join', roomName, userSub);
            socket.join(roomName);

            const users = await roomService.joinRoom(roomName, userSub);
            socket.to(roomName).emit('userJoined', { users });
        })
    );
};
