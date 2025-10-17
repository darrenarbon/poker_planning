import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';
import type {
    JoinPayload,
    VotePayload,
    ShowVotesPayload,
    SetEstimatePayload,
} from './types/socketTypes';
import { joinHandler } from './handlers/joinHandler';
import { voteHandler } from './handlers/voteHandler';
import { showVotesHandler } from './handlers/showVotesHandler';
import { setEstimateHandler } from './handlers/setEstimateHandler';

/**
 * Main socket router - registers event handlers
 * Delegates all business logic to specialized handlers
 */
const sockets = (socket: Socket, io: IOServer): void => {
    // Register join event handler
    socket.on('join', (payload: JoinPayload) => {
        joinHandler(payload, socket, io);
    });

    // Register vote event handler
    socket.on('vote', (payload: VotePayload) => {
        voteHandler(payload, socket, io);
    });

    // Register show votes event handler
    socket.on('showVotes', (payload: ShowVotesPayload) => {
        showVotesHandler(payload, socket, io);
    });

    // Register set estimate event handler
    socket.on('setEstimate', (payload: SetEstimatePayload) => {
        setEstimateHandler(payload, socket, io);
    });
};

export default sockets;
