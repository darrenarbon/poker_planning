import type { Server, Socket } from 'socket.io';

import * as ticketService from '../../services/ticketService.js';
import * as voteService from '../../services/voteService.js';
import { AppError, socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import type { VotePayload } from '../types.js';

export const registerVoteHandler = (socket: Socket, _io: Server) => {
    socket.on(
        'vote',
        socketHandler(
            socket,
            async ({ roomName, ticketId, vote }: VotePayload) => {
                const userSub = getUserSub(socket);
                console.log('vote', roomName, ticketId, vote, userSub);
                // 0 is a real vote ("No Idea"), so check the type, not truthiness
                if (!Number.isInteger(vote) || vote < 0) {
                    throw new AppError(400, 'No valid vote was submitted');
                }
                assertInRoom(socket, roomName);
                await ticketService.getTicketInRoom(roomName, ticketId);

                await voteService.castVote(ticketId, userSub, vote);
                socket
                    .to(roomName)
                    .emit('voteReceived', { ticketId, vote, userSub });
            }
        )
    );
};
