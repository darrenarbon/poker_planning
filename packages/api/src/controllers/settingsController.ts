import type { Request, Response } from 'express';

import * as userService from '../services/userService.js';
import type { Exemplar, UserSettings } from '../types/models.js';
import { AppError } from '../utils/errors.js';

const MAX_EXEMPLARS = 20;

const invalid = (message: string) => new AppError(400, message);

/** Checks the body is a valid settings object, keeping only known fields. */
export const parseSettings = (body: unknown): UserSettings => {
    if (typeof body !== 'object' || body === null) {
        throw invalid('Settings must be an object');
    }
    const { defaultBaseUrl, theme, exemplars } = body as Record<
        string,
        unknown
    >;
    const settings: UserSettings = {};

    if (defaultBaseUrl !== undefined && defaultBaseUrl !== '') {
        if (typeof defaultBaseUrl !== 'string') {
            throw invalid('defaultBaseUrl must be a string');
        }
        settings.defaultBaseUrl = defaultBaseUrl.trim();
    }

    if (theme !== undefined) {
        if (theme !== 'light' && theme !== 'dark') {
            throw invalid('theme must be light or dark');
        }
        settings.theme = theme;
    }

    if (exemplars !== undefined) {
        if (!Array.isArray(exemplars) || exemplars.length > MAX_EXEMPLARS) {
            throw invalid(
                `exemplars must be a list of up to ${MAX_EXEMPLARS} tickets`
            );
        }
        settings.exemplars = exemplars.map((e): Exemplar => {
            const { estimate, ticketNumber } = (e ?? {}) as Record<
                string,
                unknown
            >;
            if (
                typeof estimate !== 'number' ||
                !Number.isInteger(estimate) ||
                typeof ticketNumber !== 'string' ||
                !ticketNumber.trim()
            ) {
                throw invalid(
                    'Each exemplar needs a whole-number estimate and a ticket'
                );
            }
            return { estimate, ticketNumber: ticketNumber.trim() };
        });
    }

    return settings;
};

export const getSettings = async (req: Request, res: Response) => {
    res.json(await userService.getSettings(req.auth!.payload.sub!));
};

export const saveSettings = async (req: Request, res: Response) => {
    const settings = parseSettings(req.body);
    await userService.saveSettings(req.auth!.payload.sub!, settings);
    res.json(settings);
};
