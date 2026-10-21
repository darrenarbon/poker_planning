import { TicketForVoting } from './ticket';
import { UserModel } from './user';

export interface ServerToClientEvents {
    userJoined: (payload: { users: UserModel[] }) => void;
    voteReceived: (payload: {
        ticketId: string;
        vote: number;
        userSub: string;
    }) => void;
    showVotes: (payload: { ticketId: string }) => void;
    showEstimate: (payload: { currentTicket: TicketForVoting }) => void;
    error: (message: string) => void;
}

export interface ClientToServerEvents {
    join: (payload: { roomName: string; userSub: string | undefined }) => void;
    vote: (payload: {
        roomName: string;
        ticketId: string;
        vote: number;
        userSub: string | undefined;
    }) => void;
    showVotes: (payload: { roomName: string; ticketId: string }) => void;
    setEstimate: (payload: {
        roomName: string;
        currentTicket: TicketForVoting;
    }) => void;
}
