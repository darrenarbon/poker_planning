import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import {
    getCurrentTicketId,
    setCurrentTicketId,
    setTimer,
} from '../roomState.js';
import type { TicketPayload } from '../types.js';

/** The facilitator picks a ticket and everyone in the room moves to it. */
export const registerSelectTicketHandler = (socket: Socket, io: Server) => {
    socket.on(
        'selectTicket',
        socketHandler(socket, async ({ roomName, ticketId }: TicketPayload) => {
            const userSub = getUserSub(socket);
            assertInRoom(socket, roomName);
            await roomService.getRoomAsAdmin(roomName, userSub);
            if (ticketId !== null) {
                await ticketService.getTicketInRoom(roomName, ticketId);
            }
            if (getCurrentTicketId(roomName) !== ticketId) {
                // the timer belongs to the ticket being discussed
                setTimer(roomName, null);
                io.in(roomName).emit('timer', { endsAt: null });
            }
            setCurrentTicketId(roomName, ticketId);
            io.in(roomName).emit('ticketSelected', { ticketId });
        })
    );
};
