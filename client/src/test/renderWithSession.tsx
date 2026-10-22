import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { vi } from 'vitest';
import {
    PokerSessionContext,
    PokerSessionContextValue,
} from '../context/PokerSessionContext';
import { makeAuthUser, makeRoom } from './factories';

export const makeSessionValue = (
    overrides: Partial<PokerSessionContextValue> = {}
): PokerSessionContextValue => ({
    roomName: 'room-abc',
    room: makeRoom(),
    user: makeAuthUser(),
    users: [],
    onlineSubs: [],
    tickets: [],
    archivedTickets: [],
    currentTicket: undefined,
    jira: { jiraTicket: null, loading: false, error: null },
    showVotes: false,
    refinementMode: false,
    hideOwnVote: false,
    isAdmin: false,
    isOwner: false,
    timerEndsAt: null,
    loadError: null,
    error: null,
    dismissError: vi.fn(),
    selectTicket: vi.fn(),
    nextTicket: vi.fn(),
    revote: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    addCoFacilitator: vi.fn(),
    removeCoFacilitator: vi.fn(),
    handOver: vi.fn(),
    archiveSprint: vi.fn(),
    submitVote: vi.fn(),
    revealVotes: vi.fn(),
    toggleRefinementMode: vi.fn(),
    toggleFavourite: vi.fn().mockResolvedValue(undefined),
    setRoomHidden: vi.fn().mockResolvedValue(undefined),
    setEstimate: vi.fn(),
    addTicket: vi.fn().mockResolvedValue(undefined),
    deleteCurrentTicket: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

/** Renders a component that reads from usePokerSession with a fake session */
export const renderWithSession = (
    ui: ReactElement,
    overrides: Partial<PokerSessionContextValue> = {}
) => {
    const session = makeSessionValue(overrides);
    const result = render(
        <PokerSessionContext.Provider value={session}>
            {ui}
        </PokerSessionContext.Provider>
    );
    return { ...result, session };
};
