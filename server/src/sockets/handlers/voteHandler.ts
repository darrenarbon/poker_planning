import type { Server, Socket } from 'socket.io';

import * as voteService from '../../services/voteService.js';
import { AppError, socketHandler } from '../../utils/errors.js';
import type { VotePayload } from '../types.js';

export const registerVoteHandler = (socket: Socket, _io: Server) => {
    socket.on(
        'vote',
        socketHandler(
            socket,
            async ({ roomName, ticketId, vote, userSub }: VotePayload) => {
                console.log('vote', roomName, ticketId, vote, userSub);
                if (!vote) {
                    throw new AppError(400, 'No vote was submitted');
                }

                await voteService.castVote(ticketId, userSub, vote);
                socket
                    .to(roomName)
                    .emit('voteReceived', { ticketId, vote, userSub });
            }
        )
    );
};
