import { describe, expect, it, vi } from 'vitest';

import * as userRepository from '../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import { makeUser, makeVote } from '../test/factories.js';
import { castVote } from './voteService.js';

vi.mock('../repositories/userRepository.js');
vi.mock('../repositories/voteRepository.js');

const user = makeUser();

describe('castVote', () => {
    it('creates a vote when the user has not voted', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(voteRepository.findVote).mockResolvedValue(undefined);

        await castVote(100, user.auth0_sub, '5');

        expect(voteRepository.createVote).toHaveBeenCalledWith(
            100,
            user.user_id,
            '5'
        );
        expect(voteRepository.updateVote).not.toHaveBeenCalled();
    });

    it('updates an existing vote', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        vi.mocked(voteRepository.findVote).mockResolvedValue(
            makeVote({ vote_id: 42 })
        );

        await castVote(100, user.auth0_sub, '8');

        expect(voteRepository.updateVote).toHaveBeenCalledWith(42, '8');
        expect(voteRepository.createVote).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown user', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(undefined);
        await expect(castVote(100, 'nobody', '5')).rejects.toMatchObject({
            status: 404,
        });
    });
});
