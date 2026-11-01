import { Exemplar } from './settings';
import { TicketForVoting } from './ticket';
import { UserModel } from './user';

/** A room as returned by GET /room/:roomName */
export interface Room {
    /** the owner: can manage co-facilitators and hand the room over */
    adminSub: string;
    /** share the owner's facilitator rights */
    coFacilitatorSubs?: string[];
    createdAt: string;
    friendlyName: string;
    roomId: number;
    roomName: string;
    ticketBaseUrl: string;
    /** finished and hidden from everyone's room lists */
    hidden?: boolean;
    /** starred by the current user */
    favourite?: boolean;
    /** the owner's example tickets for each estimate */
    exemplars?: Exemplar[];
}

/** A room as returned by GET /me/rooms */
export interface RoomSummary {
    room_id: number;
    room_name: string;
    created_at: string;
    admin_id: number;
    friendly_name: string;
    /** the current user created this room */
    is_admin?: boolean;
    favourite?: boolean;
    hidden?: boolean;
    /** when the current user last joined, null if never */
    last_joined_at?: string | null;
}

export interface RoomDetails {
    tickets: TicketForVoting[];
    /** tickets from past sprints */
    archivedTickets?: TicketForVoting[];
    users: UserModel[];
    room: Room;
}
