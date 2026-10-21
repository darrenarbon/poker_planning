import { User } from '@auth0/auth0-react';
import { createContext } from 'react';
import { JiraTicket, Room, TicketForVoting, UserModel } from '../types';

export interface PokerSessionContextValue {
    roomName: string;
    room: Room | undefined;
    user: User | undefined;
    users: UserModel[];
    tickets: TicketForVoting[];
    currentTicket: TicketForVoting | undefined;
    jiraTicket: JiraTicket;
    showVotes: boolean;
    isAdmin: boolean;
    selectTicket: (ticket: TicketForVoting) => void;
    submitVote: (vote: number) => void;
    revealVotes: () => void;
    setEstimate: (estimate: number) => void;
    addTicket: (ticketNumber: string) => Promise<void>;
    deleteCurrentTicket: () => Promise<void>;
}

export const PokerSessionContext =
    createContext<PokerSessionContextValue | null>(null);
