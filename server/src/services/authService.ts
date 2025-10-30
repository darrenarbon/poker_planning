import { supabaseConnection } from '../database';
import { Auth0User, LoginResult } from '../types/auth';
import { auth } from 'express-oauth2-jwt-bearer';

/**
 * JWT authentication middleware using Auth0
 */
export const checkJwt = auth({
    audience: process.env.LOCAL_URL,
    issuerBaseURL: `https://dev-1jevct6pshmx18pw.uk.auth0.com/`,
});

/**
 * Validates the incoming user data from Auth0
 * @param user - The user object from Auth0
 * @returns True if valid, false otherwise
 */
export const validateUserData = (user: any): user is Auth0User => {
    if (!user || typeof user !== 'object') {
        return false;
    }

    // Required fields
    if (!user.sub || typeof user.sub !== 'string') {
        return false;
    }

    if (!user.email || typeof user.email !== 'string') {
        return false;
    }

    return true;
};

/**
 * Creates a new user in the database
 * @param userData - The user data to insert
 * @returns Promise with the created user or error
 */
export const createUser = async (userData: Auth0User) => {
    const { data, error } = await supabaseConnection
        .from('user')
        .insert({
            auth0_sub: userData.sub,
            email: userData.email,
            given_name: userData.given_name,
            family_name: userData.family_name,
            nickname: userData.nickname,
            picture: userData.picture,
        })
        .select();

    return { data, error };
};

export const getUserDetails = async (sub: string) => {
    const { data, error } = await supabaseConnection
        .from('user')
        .select()
        .eq('auth0_sub', sub);

    if (error) {
        throw error;
    }

    return data[0];
};

/**
 * Handles user login/registration flow
 * @param userData - The user data from Auth0
 * @returns Promise with user data or error
 */
export const handleUserLogin = async (
    userData: Auth0User
): Promise<LoginResult> => {
    try {
        const existingUser = await getUserDetails(userData.sub);

        if (existingUser) {
            return {
                success: true,
                user: existingUser,
                isNewUser: false,
            };
        }

        // Create new user
        const { data, error } = await createUser(userData);

        if (error) {
            return {
                success: false,
                error: error,
                message: 'Error creating user',
            };
        }

        return {
            success: true,
            user: data ? data[0] : undefined,
            isNewUser: true,
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error during login',
        };
    }
};
