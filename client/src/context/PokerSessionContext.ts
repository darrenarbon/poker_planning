import { User } from '@auth0/auth0-react';
import { createContext } from 'react';
import { JiraTicket, Room, TicketForVoting, UserModel } from '../types';

export interface PokerSessionContextValue {
    roomName: string;
    room: Room | undefined;
    user: User | undefined;
    users: UserModel[];
    /** auth0 subs of the players with the room open right now */
    onlineSubs: string[];
    tickets: TicketForVoting[];
    /** tickets from past sprints */
    archivedTickets: TicketForVoting[];
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
    /** owner or co-facilitator: can run the session */
    isAdmin: boolean;
    /** the room's owner: can manage co-facilitators and hand over */
    isOwner: boolean;
    /** epoch milliseconds the discussion timer ends at, null when off */
    timerEndsAt: number | null;
    /** the room could not be loaded at all */
    loadError: string | null;
    /** a recoverable error from an action or the socket */
    error: string | null;
    dismissError: () => void;
    /** facilitators move everyone; voters only move themselves */
    selectTicket: (ticket: TicketForVoting) => void;
    /** facilitator only: move everyone to the next ticket still to vote on */
    nextTicket: () => void;
    /** facilitator only: clear the current ticket's votes for another round */
    revote: () => void;
    startTimer: (seconds: number) => void;
    stopTimer: () => void;
    /** owner only */
    addCoFacilitator: (userSub: string) => void;
    /** owner only */
    removeCoFacilitator: (userSub: string) => void;
    /** owner only: make someone else the owner */
    handOver: (userSub: string) => void;
    /** facilitator only: archive this sprint's tickets, keeping the link */
    archiveSprint: () => void;
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
