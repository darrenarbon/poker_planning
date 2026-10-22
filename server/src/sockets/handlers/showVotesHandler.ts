import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import type { ShowVotesPayload } from '../types.js';

export const registerShowVotesHandler = (socket: Socket, io: Server) => {
    socket.on(
        'showVotes',
        socketHandler(
            socket,
            async ({ roomName, ticketId }: ShowVotesPayload) => {
                const userSub = getUserSub(socket);
                console.log('showVotes', roomName, ticketId);
                assertInRoom(socket, roomName);
                await roomService.getRoomAsAdmin(roomName, userSub);
                await ticketService.revealVotes(roomName, ticketId);
                io.in(roomName).emit('showVotes', { ticketId });
            }
        )
    );
};
