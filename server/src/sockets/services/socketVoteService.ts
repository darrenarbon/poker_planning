import type { UserData, VoteData } from '../types/socketTypes';
import {
    findUserByAuth0Sub,
    findExistingVote,
    updateVote,
    insertVote,
} from '../utils/socketDatabase';

/**
 * Service for voting operations
 */

export interface VoteResult {
    success: boolean;
    error?: any;
    message?: string;
}

/**
 * Handles user voting on a ticket
 * Updates existing vote or creates new one
 */
export const handleVote = async (
    ticketId: number,
    vote: number,
    userSub: string
): Promise<VoteResult> => {
    try {
        // Validate vote value
        if (!vote) {
            return { success: false, message: 'No vote was submitted' };
        }

        // Get user data
        const { data: userData, error: userError } = await findUserByAuth0Sub(
            userSub
        );
        if (userError) {
            return {
                success: false,
                error: userError,
                message: 'Error getting user',
            };
        }
        if (!userData || userData.length === 0) {
            return { success: false, error: null, message: 'User not found' };
        }

        const user = userData[0];

        // Check for existing vote
        const { data: existingVoteData, error: existingVoteError } =
            await findExistingVote(ticketId, user.user_id);
        if (existingVoteError) {
            return {
                success: false,
                error: existingVoteError,
                message: 'Error getting existing vote',
            };
        }

        // Update existing vote or create new one
        if (existingVoteData && existingVoteData.length > 0) {
            const { error: updateVoteError } = await updateVote(
                existingVoteData[0].vote_id,
                vote
            );
            if (updateVoteError) {
                return {
                    success: false,
                    error: updateVoteError,
                    message: 'Error updating vote',
                };
            }
        } else {
            const { error: insertVoteError } = await insertVote(
                ticketId,
                vote,
                user.user_id
            );
            if (insertVoteError) {
                return {
                    success: false,
                    error: insertVoteError,
                    message: 'Error inserting vote',
                };
            }
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error,
            message: 'Unexpected error during voting',
        };
    }
};
