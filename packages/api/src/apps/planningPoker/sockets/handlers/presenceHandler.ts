import type { Server, Socket } from 'socket.io';

import { getOnlineSubs, removeSocket } from '../roomState.js';

/** Tells each room the socket was in who is still online once it closes. */
export const registerPresenceHandler = (socket: Socket, io: Server) => {
    socket.on('disconnect', () => {
        for (const roomName of removeSocket(socket.id)) {
            io.in(roomName).emit('presence', {
                online: getOnlineSubs(roomName),
            });
        }
    });
};
