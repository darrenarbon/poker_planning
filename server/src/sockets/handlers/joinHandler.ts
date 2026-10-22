import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import { socketHandler } from '../../utils/errors.js';
import { getUserSub } from '../guards.js';
import {
    addPresence,
    getCurrentTicketId,
    getOnlineSubs,
    getTimer,
} from '../roomState.js';
import type { JoinPayload } from '../types.js';

export const registerJoinHandler = (socket: Socket, io: Server) => {
    socket.on(
        'join',
        socketHandler(socket, async ({ roomName }: JoinPayload) => {
            const userSub = getUserSub(socket);
            console.log('join', roomName, userSub);

            // throws for an unknown room, before the socket joins it
            const users = await roomService.joinRoom(roomName, userSub);
            socket.join(roomName);
            socket.to(roomName).emit('userJoined', { users });

            addPresence(roomName, userSub, socket.id);
            io.in(roomName).emit('presence', {
                online: getOnlineSubs(roomName),
            });
            // catch the newcomer up with the facilitator's ticket and timer
            socket.emit('roomState', {
                currentTicketId: getCurrentTicketId(roomName),
                timerEndsAt: getTimer(roomName)?.endsAt ?? null,
            });
        })
    );
};
