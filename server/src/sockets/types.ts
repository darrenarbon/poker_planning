import type { TicketEstimate } from '../types/models.js';

export interface JoinPayload {
    roomName: string;
    userSub?: string;
}

export interface VotePayload {
    roomName: string;
    ticketId: number;
    vote: string;
    userSub: string;
}

export interface ShowVotesPayload {
    roomName: string;
    ticketId: number;
}

export interface SetEstimatePayload {
    roomName: string;
    currentTicket: TicketEstimate & { ticket_id: number };
}
