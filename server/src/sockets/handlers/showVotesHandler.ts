import type { Server, Socket } from 'socket.io';

import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import type { ShowVotesPayload } from '../types.js';

export const registerShowVotesHandler = (socket: Socket, io: Server) => {
    socket.on(
        'showVotes',
        socketHandler(
            socket,
            async ({ roomName, ticketId }: ShowVotesPayload) => {
                console.log('showVotes', roomName, ticketId);
                await ticketService.getTicketInRoom(roomName, ticketId);
                io.in(roomName).emit('showVotes', { ticketId });
            }
        )
    );
};
