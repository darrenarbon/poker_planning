export interface User {
    user_id: number;
    auth0_sub: string;
    email: string;
    given_name: string;
    family_name: string;
    nickname: string;
    picture: string;
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
}

/** A room as it appears in one user's lists */
export interface UserRoom extends Room {
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
