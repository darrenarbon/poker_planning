import { UserModel } from '../Users/SingleUser/SingleUser';

export interface PokerSessionProps {
    roomName: string;
}

export interface VoteModel {
    usersub: string | undefined;
    vote: number;
}

export interface VoteReceivedSocketModel {
    ticketId: string;
    vote: number;
    userSub: string;
}

export interface Room {
    adminSub: number;
    createdAt: string;
    friendlyName: string;
    roomId: number;
    roomName: string;
    ticketBaseUrl: string;
}

export interface TicketsAndUsers {
    tickets: TicketForVoting[];
    users: UserModel[];
    room: Room;
}

export interface TicketForVoting {
    ticket_id: string;
    ticket_number: string;
    votes: VoteModel[];
    average_vote?: number;
    standard_deviation?: number;
    chosen_estimate?: number;
}
