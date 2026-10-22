import { describe, expect, it, vi } from 'vitest';

import * as userRepository from '../repositories/userRepository.js';
import { makeNewUser, makeUser } from '../test/factories.js';
import { ensureUser, getUserBySub } from './userService.js';

vi.mock('../repositories/userRepository.js');

describe('userService', () => {
    it('getUserBySub returns the user', async () => {
        const user = makeUser();
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        await expect(getUserBySub(user.auth0_sub)).resolves.toEqual(user);
    });

    it('getUserBySub throws 404 when missing', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(undefined);
        await expect(getUserBySub('nobody')).rejects.toMatchObject({
            status: 404,
            message: 'User not found',
        });
    });

    it('ensureUser creates a user who does not exist yet', async () => {
        const newUser = makeNewUser();
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(undefined);
        await ensureUser(newUser);
        expect(userRepository.createUser).toHaveBeenCalledWith(newUser);
    });

    it('ensureUser leaves an existing user alone', async () => {
        const user = makeUser();
        const newUser = makeNewUser();
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);
        await ensureUser(newUser);
        expect(userRepository.createUser).not.toHaveBeenCalled();
    });
});
