import type { Request, Response } from 'express';

import * as userService from '../services/userService.js';
import type { UserProfile } from '../types/models.js';
import { AppError } from '../utils/errors.js';

const MAX_NAME_LENGTH = 100;

const parseName = (value: unknown, label: string): string => {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name) {
        throw new AppError(400, `${label} is required`);
    }
    if (name.length > MAX_NAME_LENGTH) {
        throw new AppError(
            400,
            `${label} must be at most ${MAX_NAME_LENGTH} characters`
        );
    }
    return name;
};

/** Checks the body has a given and family name, keeping only those fields. */
export const parseProfile = (body: unknown): UserProfile => {
    const { givenName, familyName } = (body ?? {}) as Record<string, unknown>;
    return {
        givenName: parseName(givenName, 'Given name'),
        familyName: parseName(familyName, 'Family name'),
    };
};

export const getProfile = async (req: Request, res: Response) => {
    res.json(await userService.getProfile(req.auth!.payload.sub!));
};

export const saveProfile = async (req: Request, res: Response) => {
    const profile = parseProfile(req.body);
    await userService.saveProfile(req.auth!.payload.sub!, profile);
    res.json(profile);
};
