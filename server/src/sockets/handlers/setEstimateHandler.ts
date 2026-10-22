import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import type { SetEstimatePayload } from '../types.js';

export const registerSetEstimateHandler = (socket: Socket, _io: Server) => {
    socket.on(
        'setEstimate',
        socketHandler(
            socket,
            async ({ roomName, currentTicket }: SetEstimatePayload) => {
                const userSub = getUserSub(socket);
                assertInRoom(socket, roomName);
                await roomService.getRoomAsAdmin(roomName, userSub);

                const {
                    ticket_id,
                    chosen_estimate,
                    average_vote,
                    standard_deviation,
                } = currentTicket;

                await ticketService.setEstimate(roomName, ticket_id, {
                    chosen_estimate,
                    average_vote,
                    standard_deviation,
                });
                socket.to(roomName).emit('showEstimate', { currentTicket });
            }
        )
    );
};
