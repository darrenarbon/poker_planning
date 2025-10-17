import type { Response } from 'express';
import { supabaseConnection } from '../database';

export const getUserDetails = async (sub: string) => {
    const { data, error } = await supabaseConnection
        .from('user')
        .select()
        .eq('auth0_sub', sub);

    if (error) {
        console.error(error);
        throw error;
    }

    console.log('User details fetched:', data[0]);

    return data[0];
};

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
