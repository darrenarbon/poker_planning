import type {
    NewUser,
    Room,
    Team,
    TeamInvite,
    TeamMember,
    Ticket,
    User,
    Vote,
} from '../types/models.js';

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
    scheduled_at: '2026-01-02T09:00:00Z',
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
    sort_order: 0,
    archived_at: null,
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

export const makeTeam = (overrides: Partial<Team> = {}): Team => ({
    team_id: 50,
    name: 'Platform',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
});

export const makeTeamMember = (
    overrides: Partial<TeamMember> = {}
): TeamMember => ({
    team_id: 50,
    user_id: 1,
    role: 'member',
    joined_at: '2026-01-01T00:00:00Z',
    ...overrides,
});

export const makeTeamInvite = (
    overrides: Partial<TeamInvite> = {}
): TeamInvite => ({
    invite_id: 70,
    token: 'tok-abc',
    team_id: 50,
    role: 'member',
    created_by: 1,
    created_at: '2026-01-01T00:00:00Z',
    expires_at: '2999-01-01T00:00:00Z',
    revoked_at: null,
    ...overrides,
});
