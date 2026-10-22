import type { Server, Socket } from 'socket.io';

import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import type { ReorderTicketsPayload } from '../types.js';

/** The facilitator drags the tickets into a new order for everyone. */
export const registerReorderTicketsHandler = (socket: Socket, _io: Server) => {
    socket.on(
        'reorderTickets',
        socketHandler(
            socket,
            async ({ roomName, ticketIds }: ReorderTicketsPayload) => {
                const userSub = getUserSub(socket);
                assertInRoom(socket, roomName);
                await ticketService.reorderTickets(
                    roomName,
                    userSub,
                    ticketIds
                );
                socket.to(roomName).emit('ticketsReordered', { ticketIds });
            }
        )
    );
};
