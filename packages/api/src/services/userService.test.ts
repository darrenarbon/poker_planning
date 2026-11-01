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

    it('getSettings combines the settings row and exemplars', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 7 })
        );
        vi.mocked(userRepository.findUserSettings).mockResolvedValue({
            user_id: 7,
            default_base_url: 'https://jira.example.com/browse',
            default_theme: 'dark',
        });
        vi.mocked(userRepository.findExemplars).mockResolvedValue([
            { estimate: 3, ticketNumber: 'PP-3' },
        ]);
        await expect(getSettings('auth0|user-1')).resolves.toEqual({
            defaultBaseUrl: 'https://jira.example.com/browse',
            theme: 'dark',
            exemplars: [{ estimate: 3, ticketNumber: 'PP-3' }],
        });
    });

    it('getSettings leaves out defaults never saved', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(makeUser());
        vi.mocked(userRepository.findUserSettings).mockResolvedValue(undefined);
        vi.mocked(userRepository.findExemplars).mockResolvedValue([]);
        await expect(getSettings('auth0|user-1')).resolves.toEqual({
            exemplars: [],
        });
    });

    it('saveSettings writes each setting and replaces the exemplars', async () => {
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(
            makeUser({ user_id: 7 })
        );
        const exemplars = [{ estimate: 5, ticketNumber: 'PP-5' }];
        await saveSettings('auth0|user-1', {
            defaultBaseUrl: 'x',
            exemplars,
        });
        expect(userRepository.upsertUserSettings).toHaveBeenCalledWith({
            user_id: 7,
            default_base_url: 'x',
            default_theme: null,
        });
        expect(userRepository.replaceExemplars).toHaveBeenCalledWith(
            7,
            exemplars
        );
    });
});
