import { TicketForVoting } from './ticket';
import { UserModel } from './user';

export interface Facilitators {
    adminSub: string;
    coFacilitatorSubs: string[];
}

export interface ServerToClientEvents {
    userJoined: (payload: { users: UserModel[] }) => void;
    voteReceived: (payload: {
        ticketId: string;
        vote: number;
        userSub: string;
    }) => void;
    showVotes: (payload: { ticketId: string }) => void;
    showEstimate: (payload: { currentTicket: TicketForVoting }) => void;
    /** auth0 subs of everyone with the room open right now */
    presence: (payload: { online: string[] }) => void;
    /** sent to a socket when it joins, to catch up with the facilitator */
    roomState: (payload: {
        currentTicketId: string | null;
        timerEndsAt: number | null;
    }) => void;
    ticketSelected: (payload: { ticketId: string | null }) => void;
    votesCleared: (payload: { ticketId: string }) => void;
    /** epoch milliseconds the discussion timer ends at, null when stopped */
    timer: (payload: { endsAt: number | null }) => void;
    facilitators: (payload: Facilitators) => void;
    sprintArchived: (payload: { archivedAt: string }) => void;
    /** every current ticket id, in the facilitator's new order */
    ticketsReordered: (payload: { ticketIds: string[] }) => void;
    error: (message: string) => void;
}

export interface ClientToServerEvents {
    join: (payload: { roomName: string }) => void;
    vote: (payload: {
        roomName: string;
        ticketId: string;
        vote: number;
    }) => void;
    showVotes: (payload: { roomName: string; ticketId: string }) => void;
    setEstimate: (payload: {
        roomName: string;
        currentTicket: TicketForVoting;
    }) => void;
    selectTicket: (payload: {
        roomName: string;
        ticketId: string | null;
    }) => void;
    revote: (payload: { roomName: string; ticketId: string }) => void;
    startTimer: (payload: { roomName: string; seconds: number }) => void;
    stopTimer: (payload: { roomName: string }) => void;
    addCoFacilitator: (payload: { roomName: string; userSub: string }) => void;
    removeCoFacilitator: (payload: {
        roomName: string;
        userSub: string;
    }) => void;
    handOver: (payload: { roomName: string; userSub: string }) => void;
    archiveSprint: (payload: { roomName: string }) => void;
    reorderTickets: (payload: {
        roomName: string;
        ticketIds: string[];
    }) => void;
}
