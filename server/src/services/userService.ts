import { supabaseConnection } from '../database';
import { getUserDetails } from '../routes/routeHelper';
import { UserRoomsResult } from '../types/user';

/**
 * Fetches all rooms administered by a specific user
 * @param userSub - The Auth0 subject ID of the user
 * @returns Promise with rooms data or error
 */
export const getUserRooms = async (
    userSub: string
): Promise<UserRoomsResult> => {
    try {
        // Get user details first
        const userDetails = await getUserDetails(userSub);

        if (!userDetails) {
            return {
                success: false,
                message: 'User not found',
                error: null,
            };
        }

        // Fetch rooms for the user
        const { data, error } = await supabaseConnection
            .from('room')
            .select(
                `
                room_id,
                room_name,
                admin_id,
                created_at,
                friendly_name
            `
            )
            .eq('admin_id', userDetails.user_id)
            .order('created_at', { ascending: false });

        if (error) {
            return {
                success: false,
                error: error,
                message: 'Error fetching rooms for user',
            };
        }

        return {
            success: true,
            rooms: data || [],
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error while fetching user rooms',
        };
    }
};
