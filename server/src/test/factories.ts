import type { NewUser, Room, Ticket, User, Vote } from '../types/models.js';

export const makeUser = (overrides: Partial<User> = {}): User => ({
    user_id: 1,
    auth0_sub: 'auth0|user-1',
    email: 'user@example.com',
    given_name: 'Test',
    family_name: 'User',
    nickname: 'tester',
    picture: 'https://example.com/pic.png',
    ...overrides,
});

export const makeRoom = (overrides: Partial<Room> = {}): Room => ({
    room_id: 10,
    room_name: 'abc123def4',
    admin_id: 1,
    friendly_name: 'Sprint 1',
    ticket_base_url: 'https://jira.example.com/browse/',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
});

export const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    ticket_id: 100,
    room_id: 10,
    ticket_number: 'PP-1',
    chosen_estimate: null,
    average_vote: null,
    standard_deviation: null,
    votes_revealed: false,
    ...overrides,
});

export const makeVote = (overrides: Partial<Vote> = {}): Vote => ({
    vote_id: 1000,
    ticket_id: 100,
    user_id: 1,
    vote: 5,
    ...overrides,
});

export const makeNewUser = (overrides: Partial<NewUser> = {}): NewUser => {
    const { user_id: _userId, ...newUser } = makeUser(overrides);
    return newUser;
};
