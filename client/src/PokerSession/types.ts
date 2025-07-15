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

export enum SuggestedVoteRule {
    rule1 = 'There is a strong consensus among the votes with over half the votes being for the same estimate. This suggests that the team is aligned on the estimate and no further discussion is needed.',
    rule2 = 'The standard deviation of the votes is below 0.25, indicating that the votes are closely clustered around the average. This suggests that an estimate close to the average would be appropriate.',
    rule3 = 'The standard deviation of the votes is above 0.25, indicating that there is significant spread in the votes. This suggests that the team may need to discuss further to reach a consensus, and the next estimate in the Fibonacci sequence should be used as a conservative estimate.',
}

export interface SuggestedVote {
    vote: number;
    rule: SuggestedVoteRule;
}

export interface TicketForVoting {
    ticket_id: string;
    ticket_number: string;
    votes: VoteModel[];
    average_vote?: number;
    standard_deviation?: number;
    chosen_estimate?: number;
    mode?: number | number[] | undefined;
    suggested_vote?: SuggestedVote;
}

export interface JiraTicket {
    summary: string;
    description: string;
    creator: string;
    parent: string;
    priority: string;
}
