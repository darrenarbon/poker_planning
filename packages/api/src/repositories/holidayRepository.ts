import { supabase } from '../db/supabase.js';
import type { Holiday, HolidayInput, NewHoliday } from '../types/models.js';
import { assertNoDbError } from '../utils/errors.js';

/** A user's holidays, soonest first, optionally only those ending on or after a day. */
export const findHolidaysForUser = async (
    userId: number,
    endingOnOrAfter?: string
): Promise<Holiday[]> => {
    let query = supabase.from('holiday').select().eq('user_id', userId);
    if (endingOnOrAfter) query = query.gte('end_date', endingOnOrAfter);
    const { data, error } = await query.order('start_date');
    assertNoDbError(error, 'Error fetching holidays');
    return data ?? [];
};

/** Holidays for these users that include the given day. */
export const findHolidaysOnDay = async (
    userIds: number[],
    day: string
): Promise<Holiday[]> => {
    if (!userIds.length) return [];
    const { data, error } = await supabase
        .from('holiday')
        .select()
        .in('user_id', userIds)
        .lte('start_date', day)
        .gte('end_date', day);
    assertNoDbError(error, 'Error fetching holidays');
    return data ?? [];
};

/** Holidays for these users that overlap the days from..to, inclusive. */
export const findHolidaysInRange = async (
    userIds: number[],
    from: string,
    to: string
): Promise<Holiday[]> => {
    if (!userIds.length) return [];
    const { data, error } = await supabase
        .from('holiday')
        .select()
        .in('user_id', userIds)
        .lte('start_date', to)
        .gte('end_date', from)
        .order('start_date');
    assertNoDbError(error, 'Error fetching holidays');
    return data ?? [];
};

export const findHoliday = async (
    holidayId: number
): Promise<Holiday | undefined> => {
    const { data, error } = await supabase
        .from('holiday')
        .select()
        .eq('holiday_id', holidayId);
    assertNoDbError(error, 'Error fetching holiday');
    return data?.[0];
};

export const createHolidays = async (
    holidays: NewHoliday[]
): Promise<Holiday[]> => {
    if (!holidays.length) return [];
    const { data, error } = await supabase
        .from('holiday')
        .insert(holidays)
        .select();
    assertNoDbError(error, 'Error saving holidays');
    return data ?? [];
};

export const updateHoliday = async (
    holidayId: number,
    changes: HolidayInput
) => {
    const { error } = await supabase
        .from('holiday')
        .update(changes)
        .eq('holiday_id', holidayId);
    assertNoDbError(error, 'Error saving holiday');
};

export const deleteHoliday = async (holidayId: number) => {
    const { error } = await supabase
        .from('holiday')
        .delete()
        .eq('holiday_id', holidayId);
    assertNoDbError(error, 'Error deleting holiday');
};
