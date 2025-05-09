import { UserModel } from '../User/User';

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

export interface TicketsAndUsers {
    tickets: TicketForVoting[];
    users: UserModel[];
    adminId: number;
}

export interface TicketForVoting {
    ticket_id: string;
    ticket_number: string;
    ticket_url: string;
    votes: VoteModel[];
    average_vote?: number;
    standard_deviation?: number;
    chosen_estimate?: number;
}
