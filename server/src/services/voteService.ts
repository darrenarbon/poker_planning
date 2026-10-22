import * as voteRepository from '../repositories/voteRepository.js';
import { getUserBySub } from './userService.js';

/** Records a user's vote on a ticket, replacing any previous vote. */
export const castVote = async (
    ticketId: number,
    userSub: string,
    vote: number
) => {
    const user = await getUserBySub(userSub);
    const existing = await voteRepository.findVote(ticketId, user.user_id);

    if (existing) {
        await voteRepository.updateVote(existing.vote_id, vote);
    } else {
        await voteRepository.createVote(ticketId, user.user_id, vote);
    }
};
