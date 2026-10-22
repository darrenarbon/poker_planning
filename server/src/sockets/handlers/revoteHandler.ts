import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import type { RevotePayload } from '../types.js';

/** The facilitator clears a ticket's votes so the team can vote again. */
export const registerRevoteHandler = (socket: Socket, io: Server) => {
    socket.on(
        'revote',
        socketHandler(socket, async ({ roomName, ticketId }: RevotePayload) => {
            const userSub = getUserSub(socket);
            assertInRoom(socket, roomName);
            await roomService.getRoomAsAdmin(roomName, userSub);
            await ticketService.resetVotes(roomName, ticketId);
            io.in(roomName).emit('votesCleared', { ticketId });
        })
    );
};
