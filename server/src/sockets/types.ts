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

export interface TicketPayload {
    roomName: string;
    /** null clears the selection */
    ticketId: number | null;
}

export interface RevotePayload {
    roomName: string;
    ticketId: number;
}

export interface StartTimerPayload {
    roomName: string;
    seconds: number;
}

export interface RoomPayload {
    roomName: string;
}

export interface FacilitatorPayload {
    roomName: string;
    userSub: string;
}
