import { supabaseConnection } from '../database';
import { getUserDetails } from '../routes/routeHelper';
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
    const { error } = await supabaseConnection.from('user').insert({
        auth0_sub: userData.sub,
        email: userData.email,
        given_name: userData.given_name,
        family_name: userData.family_name,
        nickname: userData.nickname,
        picture: userData.picture,
    });

    return { error };
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
        // Check if user already exists
        const existingUser = await getUserDetails(userData.sub);

        if (existingUser) {
            return {
                success: true,
                user: existingUser,
                isNewUser: false,
            };
        }

        // Create new user
        const { error } = await createUser(userData);

        if (error) {
            return {
                success: false,
                error: error,
                message: 'Error creating user',
            };
        }

        // Fetch the newly created user
        const newUser = await getUserDetails(userData.sub);

        return {
            success: true,
            user: newUser,
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

/**
 * Formats user data for response
 * @param user - The user object from database
 * @returns Formatted user object for API response
 */
export const formatUserResponse = (user: any) => {
    return {
        id: user?.id,
        email: user?.email,
        name:
            user?.given_name && user?.family_name
                ? `${user.given_name} ${user.family_name}`
                : user?.nickname || user?.email,
        auth0_sub: user?.auth0_sub,
        picture: user?.picture,
    };
};

/**
 * Updates user profile information
 * @param userId - The user ID
 * @param updateData - The data to update
 * @returns Promise with update result
 */
export const updateUserProfile = async (
    userId: string,
    updateData: Partial<Auth0User>
) => {
    try {
        const { error } = await supabaseConnection
            .from('user')
            .update({
                email: updateData.email,
                given_name: updateData.given_name,
                family_name: updateData.family_name,
                nickname: updateData.nickname,
                picture: updateData.picture,
                updated_at: new Date().toISOString(),
            })
            .eq('auth0_sub', userId);

        if (error) {
            return {
                success: false,
                error,
                message: 'Error updating user profile',
            };
        }

        const updatedUser = await getUserDetails(userId);
        return { success: true, user: updatedUser };
    } catch (error) {
        return {
            success: false,
            error,
            message: 'Internal server error during profile update',
        };
    }
};

/**
 * Soft deletes a user account
 * @param userId - The user ID (auth0_sub)
 * @returns Promise with deletion result
 */
export const deleteUserAccount = async (userId: string) => {
    try {
        // Soft delete - mark as inactive instead of hard delete
        const { error } = await supabaseConnection
            .from('user')
            .update({
                is_active: false,
                deleted_at: new Date().toISOString(),
            })
            .eq('auth0_sub', userId);

        if (error) {
            return {
                success: false,
                error,
                message: 'Error deleting user account',
            };
        }

        return { success: true, message: 'User account deleted successfully' };
    } catch (error) {
        return {
            success: false,
            error,
            message: 'Internal server error during account deletion',
        };
    }
};
