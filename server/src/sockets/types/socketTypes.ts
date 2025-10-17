import { Socket } from 'socket.io';
import { Server as IOServer } from 'socket.io';

// Event payload interfaces
export interface JoinPayload {
    roomName: string;
    userSub: string;
}

export interface VotePayload {
    roomName: string;
    ticketId: number;
    vote: number;
    userSub: string;
}

export interface ShowVotesPayload {
    roomName: string;
    ticketId: number;
}

export interface SetEstimatePayload {
    roomName: string;
    currentTicket: {
        ticket_id: number;
        chosen_estimate: number;
        average_vote: number;
        standard_deviation: number;
        [key: string]: any;
    };
}

// Database entity interfaces
export interface UserData {
    user_id: number;
    [key: string]: any;
}

export interface RoomData {
    room_id: number;
    [key: string]: any;
}

export interface RoomUserData {
    user_id: number;
    user: UserData;
    [key: string]: any;
}

export interface VoteData {
    vote_id: number;
    user_id: number;
    [key: string]: any;
}

export interface TicketData {
    ticket_id: number;
    room_id: number;
    [key: string]: any;
}

// Utility interfaces
export interface SocketsParams {
    socket: Socket;
    io: IOServer;
}

export interface EmitError {
    (socket: Socket, error: any, message: string): void;
}

// Handler function types
export type SocketHandler = (socket: Socket, io: IOServer) => void;
export type EventHandler<T = any> = (
    payload: T,
    socket: Socket,
    io: IOServer
) => Promise<void>;
