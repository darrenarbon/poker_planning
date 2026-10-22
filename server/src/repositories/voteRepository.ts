import { supabase } from '../db/supabase.js';
import type { Vote } from '../types/models.js';
import { assertNoDbError } from '../utils/errors.js';

export interface VoteWithUser {
    vote: string;
    ticket_id: number;
    usersub: string;
}

export const findVotesForTickets = async (
    ticketIds: number[]
): Promise<VoteWithUser[]> => {
    if (ticketIds.length === 0) return [];
    const { data, error } = await supabase
        .from('vote')
        .select('vote, ticket_id, ...user(usersub:auth0_sub)')
        .in('ticket_id', ticketIds);
    assertNoDbError(error, 'Error fetching votes');
    return (data ?? []) as unknown as VoteWithUser[];
};

export const findVote = async (
    ticketId: number,
    userId: number
): Promise<Vote | undefined> => {
    const { data, error } = await supabase
        .from('vote')
        .select()
        .eq('ticket_id', ticketId)
        .eq('user_id', userId);
    assertNoDbError(error, 'Error getting existing vote');
    return data?.[0];
};

export const updateVote = async (voteId: number, vote: string) => {
    const { error } = await supabase
        .from('vote')
        .update({ vote })
        .eq('vote_id', voteId);
    assertNoDbError(error, 'Error updating vote');
};

export const createVote = async (
    ticketId: number,
    userId: number,
    vote: string
) => {
    const { error } = await supabase
        .from('vote')
        .insert({ ticket_id: ticketId, user_id: userId, vote });
    assertNoDbError(error, 'Error inserting vote');
};
