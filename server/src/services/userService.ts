import * as userRepository from '../repositories/userRepository.js';
import type { NewUser, User, UserSettings } from '../types/models.js';
import { notFound } from '../utils/errors.js';

export const getUserBySub = async (sub: string): Promise<User> => {
    const user = await userRepository.findUserBySub(sub);
    if (!user) {
        throw notFound('User not found');
    }
    return user;
};

/** Creates the user on first login; does nothing if they already exist. */
export const ensureUser = async (user: NewUser) => {
    const existing = await userRepository.findUserBySub(user.auth0_sub);
    if (!existing) {
        await userRepository.createUser(user);
    }
};

export const getSettings = async (sub: string): Promise<UserSettings> => {
    const user = await getUserBySub(sub);
    const [row, exemplars] = await Promise.all([
        userRepository.findUserSettings(user.user_id),
        userRepository.findExemplars(user.user_id),
    ]);
    return {
        ...(row?.default_base_url && { defaultBaseUrl: row.default_base_url }),
        ...(row?.default_theme && { theme: row.default_theme }),
        exemplars,
    };
};

export const saveSettings = async (sub: string, settings: UserSettings) => {
    const user = await getUserBySub(sub);
    await userRepository.upsertUserSettings({
        user_id: user.user_id,
        default_base_url: settings.defaultBaseUrl ?? null,
        default_theme: settings.theme ?? null,
    });
    await userRepository.replaceExemplars(
        user.user_id,
        settings.exemplars ?? []
    );
};
