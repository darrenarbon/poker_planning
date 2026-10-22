import { supabase } from '../db/supabase.js';
import type { NewUser, User } from '../types/models.js';
import { assertNoDbError } from '../utils/errors.js';

export const findUserBySub = async (sub: string): Promise<User | undefined> => {
    const { data, error } = await supabase
        .from('user')
        .select()
        .eq('auth0_sub', sub);
    assertNoDbError(error, 'Error fetching user');
    return data?.[0];
};

export const findUsersByIds = async (userIds: number[]): Promise<User[]> => {
    const { data, error } = await supabase
        .from('user')
        .select()
        .in('user_id', userIds);
    assertNoDbError(error, 'Error fetching users');
    return data ?? [];
};

export const createUser = async (user: NewUser) => {
    const { error } = await supabase.from('user').insert(user);
    assertNoDbError(error, 'Error creating user');
};
