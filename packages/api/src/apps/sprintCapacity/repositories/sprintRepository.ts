import { supabase } from '../../../db/supabase.js';
import type { NewSprint, Sprint, SprintInput } from '../../../types/models.js';
import { assertNoDbError } from '../../../utils/errors.js';

/** A team's sprints, most recent first. */
export const findSprintsForTeam = async (teamId: number): Promise<Sprint[]> => {
    const { data, error } = await supabase
        .from('sprint')
        .select()
        .eq('team_id', teamId)
        .order('start_date', { ascending: false });
    assertNoDbError(error, 'Error fetching sprints');
    return data ?? [];
};

export const findSprint = async (
    sprintId: number
): Promise<Sprint | undefined> => {
    const { data, error } = await supabase
        .from('sprint')
        .select()
        .eq('sprint_id', sprintId);
    assertNoDbError(error, 'Error fetching sprint');
    return data?.[0];
};

export const createSprint = async (sprint: NewSprint): Promise<Sprint> => {
    const { data, error } = await supabase
        .from('sprint')
        .insert(sprint)
        .select();
    assertNoDbError(error, 'Error creating sprint');
    return data![0];
};

export const updateSprint = async (
    sprintId: number,
    changes: Partial<
        SprintInput &
            Pick<Sprint, 'status' | 'available_person_days' | 'closed_at'>
    >
) => {
    const { error } = await supabase
        .from('sprint')
        .update(changes)
        .eq('sprint_id', sprintId);
    assertNoDbError(error, 'Error saving sprint');
};

export const deleteSprint = async (sprintId: number) => {
    const { error } = await supabase
        .from('sprint')
        .delete()
        .eq('sprint_id', sprintId);
    assertNoDbError(error, 'Error deleting sprint');
};

/** Who is in each of these sprints, as sprint id to user ids. */
export const findSprintMembers = async (
    sprintIds: number[]
): Promise<Map<number, number[]>> => {
    const members = new Map<number, number[]>();
    if (!sprintIds.length) return members;
    const { data, error } = await supabase
        .from('sprint_member')
        .select('sprint_id, user_id')
        .in('sprint_id', sprintIds);
    assertNoDbError(error, 'Error fetching sprint members');
    for (const row of data ?? []) {
        members.set(row.sprint_id, [
            ...(members.get(row.sprint_id) ?? []),
            row.user_id,
        ]);
    }
    return members;
};

/** Replaces who is in a sprint. */
export const setSprintMembers = async (sprintId: number, userIds: number[]) => {
    const { error: deleteError } = await supabase
        .from('sprint_member')
        .delete()
        .eq('sprint_id', sprintId);
    assertNoDbError(deleteError, 'Error saving sprint members');
    if (!userIds.length) return;
    const { error } = await supabase
        .from('sprint_member')
        .insert(userIds.map((user_id) => ({ sprint_id: sprintId, user_id })));
    assertNoDbError(error, 'Error saving sprint members');
};
