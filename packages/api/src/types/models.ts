export interface User {
    user_id: number;
    auth0_sub: string;
    email: string;
    given_name: string;
    family_name: string;
    nickname: string;
    picture: string;
    /** can see and manage every team and room, whatever the team */
    is_super_admin?: boolean;
}

/** An example ticket showing the team what an estimate looks like */
export interface Exemplar {
    estimate: number;
    ticketNumber: string;
}

export interface UserSettings {
    /** prefilled when creating a room */
    defaultBaseUrl?: string;
    /** the theme the app opens in */
    theme?: 'light' | 'dark';
    /** shown on the voting page of rooms this user owns */
    exemplars?: Exemplar[];
}

/** A row of user_settings */
export interface UserSettingsRow {
    user_id: number;
    default_base_url: string | null;
    default_theme: 'light' | 'dark' | null;
}

/** A row of user_exemplar */
export interface UserExemplarRow {
    exemplar_id: number;
    user_id: number;
    estimate: number;
    ticket_number: string;
}

export type NewUser = Omit<User, 'user_id'>;

export interface Room {
    room_id: number;
    room_name: string;
    admin_id: number;
    friendly_name: string;
    ticket_base_url: string;
    created_at: string;
    hidden?: boolean;
    /** the team the room belongs to, if any */
    team_id?: number | null;
    /** when the planning session happens */
    scheduled_at?: string;
}

/** A room as it appears in one user's lists */
export interface UserRoom extends Room {
    /** the user owns the room or can manage it as a team admin or super admin */
    is_admin: boolean;
    favourite: boolean;
    last_joined_at: string | null;
}

export interface Ticket {
    ticket_id: number;
    room_id: number;
    ticket_number: string;
    chosen_estimate: number | null;
    average_vote: number | null;
    standard_deviation: number | null;
    votes_revealed: boolean;
    /** position in the room's sprint, lowest first */
    sort_order: number;
    /** set when a new sprint started, null for the current sprint */
    archived_at: string | null;
}

export type TicketEstimate = Pick<
    Ticket,
    'chosen_estimate' | 'average_vote' | 'standard_deviation'
>;

export interface Vote {
    vote_id: number;
    ticket_id: number;
    user_id: number;
    vote: number;
}

export const TEAM_ROLES = ['owner', 'admin', 'member'] as const;

/** What someone can do in a team: owners manage everything, admins manage members */
export type TeamRole = (typeof TEAM_ROLES)[number];

export interface Team {
    team_id: number;
    name: string;
    created_at: string;
}

export interface TeamMember {
    team_id: number;
    user_id: number;
    role: TeamRole;
    joined_at: string;
}

/** A link that adds whoever opens it to a team */
export interface TeamInvite {
    invite_id: number;
    token: string;
    team_id: number;
    /** never owner: ownership is handed over, not invited */
    role: Exclude<TeamRole, 'owner'>;
    created_by: number | null;
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
}

/** A team as it appears in one user's lists */
export interface UserTeam extends Team {
    /** the user's role in it, null for a super admin who is not a member */
    role: TeamRole | null;
    member_count: number;
}
