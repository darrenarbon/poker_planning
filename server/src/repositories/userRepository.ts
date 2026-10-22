import { supabase } from '../db/supabase.js';
import type {
    Exemplar,
    NewUser,
    User,
    UserExemplarRow,
    UserSettingsRow,
} from '../types/models.js';
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

export const findUserSettings = async (
    userId: number
): Promise<UserSettingsRow | undefined> => {
    const { data, error } = await supabase
        .from('user_settings')
        .select()
        .eq('user_id', userId);
    assertNoDbError(error, 'Error fetching settings');
    return data?.[0];
};

export const upsertUserSettings = async (settings: UserSettingsRow) => {
    const { error } = await supabase.from('user_settings').upsert(settings);
    assertNoDbError(error, 'Error saving settings');
};

export const findExemplars = async (userId: number): Promise<Exemplar[]> => {
    const { data, error } = await supabase
        .from('user_exemplar')
        .select()
        .eq('user_id', userId)
        .order('estimate');
    assertNoDbError(error, 'Error fetching exemplars');
    return ((data ?? []) as UserExemplarRow[]).map((row) => ({
        estimate: row.estimate,
        ticketNumber: row.ticket_number,
    }));
};

/** Replaces all of the user's exemplars with the given ones */
export const replaceExemplars = async (
    userId: number,
    exemplars: Exemplar[]
) => {
    const { error: deleteError } = await supabase
        .from('user_exemplar')
        .delete()
        .eq('user_id', userId);
    assertNoDbError(deleteError, 'Error saving exemplars');
    if (exemplars.length === 0) return;
    const { error } = await supabase.from('user_exemplar').insert(
        exemplars.map(({ estimate, ticketNumber }) => ({
            user_id: userId,
            estimate,
            ticket_number: ticketNumber,
        }))
    );
    assertNoDbError(error, 'Error saving exemplars');
};
