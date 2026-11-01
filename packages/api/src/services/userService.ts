import * as userRepository from '../repositories/userRepository.js';
import type {
    NewUser,
    User,
    UserProfile,
    UserSettings,
} from '../types/models.js';
import { notFound } from '../utils/errors.js';

export const getUserBySub = async (sub: string): Promise<User> => {
    const user = await userRepository.findUserBySub(sub);
    if (!user) {
        throw notFound('User not found');
    }
    return user;
};

/**
 * Given and family name for a login. Some providers (e.g. username and
 * password logins) send only a full name, so split that instead; an email
 * address used as the name is not a name.
 */
export const resolveNames = (
    user: { given_name?: string | null; family_name?: string | null },
    fullName?: unknown
): { given_name: string | null; family_name: string | null } => {
    if (user.given_name || user.family_name) {
        return {
            given_name: user.given_name || null,
            family_name: user.family_name || null,
        };
    }
    const [first, ...rest] =
        typeof fullName === 'string' && !fullName.includes('@')
            ? fullName.trim().split(/\s+/)
            : [];
    return { given_name: first || null, family_name: rest.join(' ') || null };
};

/**
 * Creates the user on first login. For an existing user it only fills in a
 * name that is missing; a name already stored (possibly one they chose) is
 * never overwritten.
 */
export const ensureUser = async (user: NewUser, fullName?: unknown) => {
    const names = resolveNames(user, fullName);
    const existing = await userRepository.findUserBySub(user.auth0_sub);
    if (!existing) {
        await userRepository.createUser({ ...user, ...names } as NewUser);
    } else if (
        !existing.given_name &&
        !existing.family_name &&
        (names.given_name || names.family_name)
    ) {
        await userRepository.updateUserName(
            existing.user_id,
            names.given_name ?? '',
            names.family_name ?? ''
        );
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

export const getProfile = async (sub: string): Promise<UserProfile> => {
    const user = await getUserBySub(sub);
    // either name can be missing for users whose login supplied none
    return {
        givenName: user.given_name ?? '',
        familyName: user.family_name ?? '',
    };
};

/**
 * Names are stored on our own user record, which login never overwrites
 * (ensureUser only creates), so the change sticks without touching Auth0.
 */
export const saveProfile = async (sub: string, profile: UserProfile) => {
    const user = await getUserBySub(sub);
    await userRepository.updateUserName(
        user.user_id,
        profile.givenName,
        profile.familyName
    );
};
