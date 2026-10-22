import { describe, expect, it, vi } from 'vitest';

import * as userRepository from '../repositories/userRepository.js';
import { makeNewUser, makeUser } from '../test/factories.js';
import {
    ensureUser,
    getSettings,
    getUserBySub,
    saveSettings,
} from './userService.js';

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

    it('getSettings returns the saved settings, or none', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValueOnce(
            makeUser({ settings: { theme: 'dark' } })
        );
        await expect(getSettings('auth0|user-1')).resolves.toEqual({
            theme: 'dark',
        });
        vi.mocked(userRepository.findUserBySub).mockResolvedValueOnce(
            makeUser()
        );
        await expect(getSettings('auth0|user-1')).resolves.toEqual({});
    });

    it("saveSettings stores them against the user's id", async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 7 })
        );
        await saveSettings('auth0|user-1', { defaultBaseUrl: 'x' });
        expect(userRepository.updateUserSettings).toHaveBeenCalledWith(7, {
            defaultBaseUrl: 'x',
        });
    });
});
