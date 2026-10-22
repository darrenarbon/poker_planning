import type { Request, Response } from 'express';

import * as userService from '../services/userService.js';
import { AppError } from '../utils/errors.js';

export const login = async (req: Request, res: Response) => {
    const { user } = req.body ?? {};
    if (!user?.sub) {
        throw new AppError(400, 'User details are required');
    }
    const { sub, email, given_name, family_name, nickname, picture } = user;

    await userService.ensureUser({
        auth0_sub: sub,
        email,
        given_name,
        family_name,
        nickname,
        picture,
    });
    res.status(200).json({});
};
