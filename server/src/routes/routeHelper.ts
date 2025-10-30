import type { Response } from 'express';

export const returnError = (
    res: Response,
    code: number,
    error: any,
    message: string,
    friendlyMessage?: string
) => {
    console.error(friendlyMessage || message, error);
    return res.status(code).json({ error: message });
};
