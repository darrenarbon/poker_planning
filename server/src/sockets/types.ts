import type { TicketEstimate } from '../types/models.js';

export interface JoinPayload {
    roomName: string;
}

export interface VotePayload {
    roomName: string;
    ticketId: number;
    vote: number;
}

export interface ShowVotesPayload {
    roomName: string;
    ticketId: number;
}

export interface SetEstimatePayload {
    roomName: string;
    currentTicket: TicketEstimate & { ticket_id: number };
}
