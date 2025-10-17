import { Request } from 'express';

// confirmed in use

export interface Auth0User {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    nickname?: string;
    picture?: string;
}

export interface LoginResult {
    success: boolean;
    user?: DatabaseUser;
    isNewUser?: boolean;
    error?: any;
    message?: string;
}

export interface LoginRequest extends Request {
    body: {
        user: Auth0User;
    };
}

// need to check these types are used

export interface DatabaseUser {
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

export interface UserResponse {
    id: number;
    email: string;
    name: string;
    auth0_sub: string;
    picture?: string;
}

export interface UpdateUserRequest {
    email?: string;
    given_name?: string;
    family_name?: string;
    nickname?: string;
    picture?: string;
}

export interface LoginResponse {
    message: string;
    user: UserResponse;
    isNewUser: boolean;
}

export interface ErrorResponse {
    error: string;
    message?: string;
    details?: any;
}
