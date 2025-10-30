import { Request } from 'express';
import { User } from './user';

/**
 * Room related types
 */
export interface Room {
    room_id: number;
    room_name: string;
    admin_id: number;
    friendly_name: string;
    ticket_base_url?: string;
    created_at: string;
    auth0_sub?: string;
}

export interface RoomUser {
    room_id: number;
    user_id: number;
}

export interface Ticket {
    ticket_id: number;
    room_id: number;
    ticket_number: string;
    final_estimate?: number;
    created_at: string;
}

export interface Vote {
    vote_id: number;
    ticket_id: number;
    user_id: number;
    vote: number;
    created_at: string;
    usersub?: string;
}

export interface TicketWithVotes extends Ticket {
    votes: Vote[];
}

/**
 * API Request/Response types
 */
export interface CreateRoomRequest {
    roomName: string;
    baseUrl?: string;
}

export interface AddTicketsRequest {
    ticketsToSave: string[];
}

export interface AddSingleTicketRequest {
    ticketNumber: string;
}

export interface RoomResponse {
    adminSub: string;
    createdAt: string;
    friendlyName: string;
    roomId: number;
    roomName: string;
    ticketBaseUrl?: string;
}

export interface RoomDetailsResponse {
    tickets: TicketWithVotes[];
    users: User[];
    room: RoomResponse;
}

/**
 * Service result types
 */
export interface ServiceResult<T = any> {
    success: boolean;
    data?: T;
    error?: any;
    message?: string;
    status?: number;
}

export interface CreateRoomResult extends ServiceResult {
    data?: {
        roomId: string;
        roomData: Room;
    };
}

export interface AddTicketsResult extends ServiceResult {
    data?: {
        message: string;
        ticketsAdded: number;
    };
}

export interface RoomDetailsResult extends ServiceResult {
    data?: RoomDetailsResponse;
}
