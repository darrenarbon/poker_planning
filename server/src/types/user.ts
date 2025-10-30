import { Room } from './room';

export interface User {
    user_id: number;
    auth0_sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    nickname?: string;
    picture?: string;
    created_at: string;
    superuser: boolean;
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
