import { supabase } from '../db/supabase.js';
import type {
    Team,
    TeamInvite,
    TeamMember,
    TeamRole,
    User,
} from '../types/models.js';
import { assertNoDbError } from '../utils/errors.js';

export interface MembershipWithTeam {
    role: TeamRole;
    team: Team;
}

export interface MemberWithUser {
    role: TeamRole;
    joined_at: string;
    user: User;
}

export const createTeam = async (name: string): Promise<Team> => {
    const { data, error } = await supabase
        .from('team')
        .insert({ name })
        .select();
    assertNoDbError(error, 'Error creating team');
    return data![0];
};

export const findTeamById = async (
    teamId: number
): Promise<Team | undefined> => {
    const { data, error } = await supabase
        .from('team')
        .select()
        .eq('team_id', teamId);
    assertNoDbError(error, 'Error fetching team');
    return data?.[0];
};

export const findAllTeams = async (): Promise<Team[]> => {
    const { data, error } = await supabase.from('team').select().order('name');
    assertNoDbError(error, 'Error fetching teams');
    return data ?? [];
};

export const updateTeamName = async (teamId: number, name: string) => {
    const { error } = await supabase
        .from('team')
        .update({ name })
        .eq('team_id', teamId);
    assertNoDbError(error, 'Error renaming team');
};

export const deleteTeam = async (teamId: number) => {
    const { error } = await supabase
        .from('team')
        .delete()
        .eq('team_id', teamId);
    assertNoDbError(error, 'Error deleting team');
};

/** The teams a user belongs to, with their role in each. */
export const findMembershipsForUser = async (
    userId: number
): Promise<MembershipWithTeam[]> => {
    const { data, error } = await supabase
        .from('team_member')
        .select('role, team:team_id(*)')
        .eq('user_id', userId);
    assertNoDbError(error, 'Error fetching teams for user');
    return (data ?? []) as unknown as MembershipWithTeam[];
};

/** Teams where the user is an owner or admin. */
export const findManagedTeamIds = async (userId: number): Promise<number[]> => {
    const { data, error } = await supabase
        .from('team_member')
        .select('team_id')
        .eq('user_id', userId)
        .in('role', ['owner', 'admin']);
    assertNoDbError(error, 'Error fetching managed teams');
    return (data ?? []).map((row) => row.team_id);
};

export const findMember = async (
    teamId: number,
    userId: number
): Promise<TeamMember | undefined> => {
    const { data, error } = await supabase
        .from('team_member')
        .select()
        .eq('team_id', teamId)
        .eq('user_id', userId);
    assertNoDbError(error, 'Error fetching team member');
    return data?.[0];
};

export const findMembers = async (
    teamId: number
): Promise<MemberWithUser[]> => {
    const { data, error } = await supabase
        .from('team_member')
        .select('role, joined_at, user:user_id(*)')
        .eq('team_id', teamId)
        .order('joined_at');
    assertNoDbError(error, 'Error fetching team members');
    return (data ?? []) as unknown as MemberWithUser[];
};

/** How many people are in each of the teams. */
export const countMembers = async (
    teamIds: number[]
): Promise<Map<number, number>> => {
    const counts = new Map<number, number>();
    if (!teamIds.length) return counts;
    const { data, error } = await supabase
        .from('team_member')
        .select('team_id')
        .in('team_id', teamIds);
    assertNoDbError(error, 'Error counting team members');
    for (const row of data ?? []) {
        counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
    }
    return counts;
};

export const addMember = async (
    teamId: number,
    userId: number,
    role: TeamRole
) => {
    const { error } = await supabase
        .from('team_member')
        .insert({ team_id: teamId, user_id: userId, role });
    assertNoDbError(error, 'Error adding team member');
};

export const updateMemberRole = async (
    teamId: number,
    userId: number,
    role: TeamRole
) => {
    const { error } = await supabase
        .from('team_member')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId);
    assertNoDbError(error, 'Error changing team role');
};

export const removeMember = async (teamId: number, userId: number) => {
    const { error } = await supabase
        .from('team_member')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);
    assertNoDbError(error, 'Error removing team member');
};

export const createInvite = async (
    invite: Pick<
        TeamInvite,
        'token' | 'team_id' | 'role' | 'created_by' | 'expires_at'
    >
): Promise<TeamInvite> => {
    const { data, error } = await supabase
        .from('team_invite')
        .insert(invite)
        .select();
    assertNoDbError(error, 'Error creating invite');
    return data![0];
};

export const findInviteByToken = async (
    token: string
): Promise<TeamInvite | undefined> => {
    const { data, error } = await supabase
        .from('team_invite')
        .select()
        .eq('token', token);
    assertNoDbError(error, 'Error fetching invite');
    return data?.[0];
};

/** Invites that have not been revoked or expired. */
export const findActiveInvites = async (
    teamId: number
): Promise<TeamInvite[]> => {
    const { data, error } = await supabase
        .from('team_invite')
        .select()
        .eq('team_id', teamId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
    assertNoDbError(error, 'Error fetching invites');
    const now = Date.now();
    return (data ?? []).filter(
        (invite: TeamInvite) => new Date(invite.expires_at).getTime() > now
    );
};

export const revokeInvite = async (teamId: number, inviteId: number) => {
    const { error } = await supabase
        .from('team_invite')
        .update({ revoked_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('invite_id', inviteId);
    assertNoDbError(error, 'Error revoking invite');
};
