import type { Request, Response } from 'express';

import * as userService from '../services/userService.js';
import { AppError } from '../utils/errors.js';

/**
 * Creates the user on first login. Who they are comes from the verified
 * token; the body only supplies profile details for their own record.
 */
export const login = async (req: Request, res: Response) => {
    const { user } = req.body ?? {};
    if (typeof user !== 'object' || user === null) {
        throw new AppError(400, 'User details are required');
    }
    const { email, given_name, family_name, nickname, picture } = user;

    await userService.ensureUser({
        auth0_sub: req.auth!.payload.sub!,
        email,
        given_name,
        family_name,
        nickname,
        picture,
    });
    res.status(200).json({});
};
