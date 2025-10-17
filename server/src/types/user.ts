// User related types

export interface User {
    id: number;
    auth0_sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    nickname?: string;
    picture?: string;
    is_active?: boolean;
    created_at: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface Room {
    id: number;
    room_name: string;
    admin_id: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

// Request/Response interfaces
export interface GetUserRoomsResponse {
    rooms: Room[];
}

export interface GetUserRoomsParams {
    userSub: string;
}

// Service result interfaces
export interface UserRoomsResult {
    success: boolean;
    rooms?: Room[];
    error?: any;
    message?: string;
}

// Additional user-related interfaces
export interface CreateUserRequest {
    auth0_sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    nickname?: string;
    picture?: string;
}

export interface UpdateUserRequest {
    email?: string;
    given_name?: string;
    family_name?: string;
    nickname?: string;
    picture?: string;
}
