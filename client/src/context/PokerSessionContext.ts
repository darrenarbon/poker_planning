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
    jira: {
        jiraTicket: JiraTicket | null;
        loading: boolean;
        error: string | null;
    };
    showVotes: boolean;
    /** facilitator is screen sharing: keep their own vote hidden until reveal */
    refinementMode: boolean;
    /** true when the current user's own vote should be hidden on screen */
    hideOwnVote: boolean;
    isAdmin: boolean;
    /** the room could not be loaded at all */
    loadError: string | null;
    /** a recoverable error from an action or the socket */
    error: string | null;
    dismissError: () => void;
    selectTicket: (ticket: TicketForVoting) => void;
    submitVote: (vote: number) => void;
    revealVotes: () => void;
    toggleRefinementMode: () => void;
    toggleFavourite: () => Promise<void>;
    /** facilitator only: hide a finished room from everyone's lists, or bring it back */
    setRoomHidden: (hidden: boolean) => Promise<void>;
    setEstimate: (estimate: number) => void;
    addTicket: (ticketNumber: string) => Promise<void>;
    deleteCurrentTicket: () => Promise<void>;
}

export const PokerSessionContext =
    createContext<PokerSessionContextValue | null>(null);
