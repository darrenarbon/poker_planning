import { TicketForVoting } from './ticket';
import { UserModel } from './user';

/** A room as returned by GET /room/:roomName */
export interface Room {
    adminSub: string;
    createdAt: string;
    friendlyName: string;
    roomId: number;
    roomName: string;
    ticketBaseUrl: string;
}

/** A room as returned by GET /users/:sub/rooms */
export interface RoomSummary {
    room_id: number;
    room_name: string;
    created_at: string;
    admin_id: number;
    friendly_name: string;
}

export interface RoomDetails {
    tickets: TicketForVoting[];
    users: UserModel[];
    room: Room;
}
