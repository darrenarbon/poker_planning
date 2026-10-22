import * as userRepository from '../repositories/userRepository.js';
import type { NewUser, User } from '../types/models.js';
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
