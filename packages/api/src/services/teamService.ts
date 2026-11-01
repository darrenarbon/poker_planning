import { randomBytes } from 'crypto';

import * as teamRepository from '../repositories/teamRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { TEAM_ROLES } from '../types/models.js';
import type {
    Team,
    TeamInvite,
    TeamRole,
    User,
    UserTeam,
} from '../types/models.js';
import { AppError, notFound } from '../utils/errors.js';
import { getUserBySub } from './userService.js';

const MAX_NAME_LENGTH = 80;
const DEFAULT_INVITE_DAYS = 7;
const MAX_INVITE_DAYS = 90;

export type AssignableRole = Exclude<TeamRole, 'owner'>;

/** The acting user and what they may do in one team. */
export interface TeamAccess {
    user: User;
    team: Team;
    /** their own role in the team, null for a super admin who is not in it */
    role: TeamRole | null;
    isSuperAdmin: boolean;
    /** owner or super admin: can change roles, hand over or delete the team */
    isOwner: boolean;
    /** owner, admin or super admin: can invite and remove members */
    isManager: boolean;
}

const validName = (name: unknown): string => {
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) throw new AppError(400, 'A team needs a name');
    if (trimmed.length > MAX_NAME_LENGTH) {
        throw new AppError(
            400,
            `A team name can be at most ${MAX_NAME_LENGTH} characters`
        );
    }
    return trimmed;
};

export const isAssignableRole = (role: unknown): role is AssignableRole =>
    role === 'admin' || role === 'member';

export const isTeamRole = (role: unknown): role is TeamRole =>
    TEAM_ROLES.includes(role as TeamRole);

/** What a user may do in a team. Super admins can do everything. */
export const resolveAccess = async (
    user: User,
    team: Team
): Promise<TeamAccess> => {
    const member = await teamRepository.findMember(team.team_id, user.user_id);
    const isSuperAdmin = !!user.is_super_admin;
    const role = member?.role ?? null;
    return {
        user,
        team,
        role,
        isSuperAdmin,
        isOwner: isSuperAdmin || role === 'owner',
        isManager: isSuperAdmin || role === 'owner' || role === 'admin',
    };
};

const loadTeam = async (teamId: number): Promise<Team> => {
    const team = await teamRepository.findTeamById(teamId);
    if (!team) throw notFound('Team not found');
    return team;
};

/** Loads the team for someone who belongs to it (or is a super admin). */
export const getAccess = async (
    teamId: number,
    userSub: string
): Promise<TeamAccess> => {
    const [user, team] = await Promise.all([
        getUserBySub(userSub),
        loadTeam(teamId),
    ]);
    const access = await resolveAccess(user, team);
    // a 404, not a 403, so outsiders cannot tell which teams exist
    if (!access.role && !access.isSuperAdmin) throw notFound('Team not found');
    return access;
};

const requireManager = async (teamId: number, userSub: string) => {
    const access = await getAccess(teamId, userSub);
    if (!access.isManager) {
        throw new AppError(403, 'Only a team owner or admin can do that');
    }
    return access;
};

const requireOwner = async (teamId: number, userSub: string) => {
    const access = await getAccess(teamId, userSub);
    if (!access.isOwner) {
        throw new AppError(403, 'Only the team owner can do that');
    }
    return access;
};

/** Ids of the teams whose rooms the user can see and manage. */
export const getManagedTeamIds = async (user: User): Promise<number[]> => {
    if (user.is_super_admin) {
        return (await teamRepository.findAllTeams()).map((t) => t.team_id);
    }
    return teamRepository.findManagedTeamIds(user.user_id);
};

/** Whether the user may manage a team's rooms (owner, admin or super admin). */
export const canManageTeam = async (
    user: User,
    teamId: number
): Promise<boolean> => {
    if (user.is_super_admin) return true;
    const member = await teamRepository.findMember(teamId, user.user_id);
    return member?.role === 'owner' || member?.role === 'admin';
};

/** Whether the user is in the team at all (or is a super admin). */
export const isTeamMember = async (
    user: User,
    teamId: number
): Promise<boolean> => {
    if (user.is_super_admin) return true;
    return !!(await teamRepository.findMember(teamId, user.user_id));
};

export const createTeam = async (userSub: string, name: unknown) => {
    const user = await getUserBySub(userSub);
    const team = await teamRepository.createTeam(validName(name));
    await teamRepository.addMember(team.team_id, user.user_id, 'owner');
    return team;
};

/** The user's teams, or every team for a super admin. */
export const getTeamsForUser = async (
    userSub: string
): Promise<{ teams: UserTeam[]; isSuperAdmin: boolean }> => {
    const user = await getUserBySub(userSub);
    const memberships = await teamRepository.findMembershipsForUser(
        user.user_id
    );
    const roles = new Map(memberships.map((m) => [m.team.team_id, m.role]));
    const teams = user.is_super_admin
        ? await teamRepository.findAllTeams()
        : memberships.map((m) => m.team);

    const counts = await teamRepository.countMembers(
        teams.map((t) => t.team_id)
    );
    return {
        isSuperAdmin: !!user.is_super_admin,
        teams: teams
            .map((team): UserTeam => ({
                ...team,
                role: roles.get(team.team_id) ?? null,
                member_count: counts.get(team.team_id) ?? 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    };
};

/** A team with its members, and what the viewer may do in it. */
export const getTeamDetails = async (teamId: number, userSub: string) => {
    const access = await getAccess(teamId, userSub);
    const members = await teamRepository.findMembers(teamId);
    return {
        team: access.team,
        myRole: access.role,
        isSuperAdmin: access.isSuperAdmin,
        canManage: access.isManager,
        canChangeRoles: access.isOwner,
        members: members.map(({ role, joined_at, user }) => ({
            userId: user.user_id,
            sub: user.auth0_sub,
            email: user.email,
            givenName: user.given_name,
            familyName: user.family_name,
            nickname: user.nickname,
            picture: user.picture,
            role,
            joinedAt: joined_at,
        })),
    };
};

/** Everyone in a team, for picking who goes into one of its rooms. */
export const getTeamMembers = async (teamId: number, userSub: string) => {
    await getAccess(teamId, userSub);
    return (await teamRepository.findMembers(teamId)).map((m) => m.user);
};

export const renameTeam = async (
    teamId: number,
    userSub: string,
    name: unknown
) => {
    await requireManager(teamId, userSub);
    await teamRepository.updateTeamName(teamId, validName(name));
};

/** Deleting a team keeps its rooms, they just stop belonging to it. */
export const deleteTeam = async (teamId: number, userSub: string) => {
    await requireOwner(teamId, userSub);
    await teamRepository.deleteTeam(teamId);
};

/** Admins can only bring in plain members; owners can also add admins. */
const assertCanGrant = (access: TeamAccess, role: AssignableRole) => {
    if (role === 'admin' && !access.isOwner) {
        throw new AppError(
            403,
            'Only the team owner can make someone an admin'
        );
    }
};

const addIfNew = async (teamId: number, user: User, role: AssignableRole) => {
    if (await teamRepository.findMember(teamId, user.user_id)) {
        throw new AppError(409, 'That person is already in the team');
    }
    await teamRepository.addMember(teamId, user.user_id, role);
};

/** Adds someone who already has an account, by their email address. */
export const addMemberByEmail = async (
    teamId: number,
    userSub: string,
    email: unknown,
    role: unknown = 'member'
) => {
    const access = await requireManager(teamId, userSub);
    if (typeof email !== 'string' || !email.trim()) {
        throw new AppError(400, 'An email address is required');
    }
    if (!isAssignableRole(role)) {
        throw new AppError(400, 'role must be admin or member');
    }
    assertCanGrant(access, role);

    const target = await userRepository.findUserByEmail(email.trim());
    if (!target) {
        throw notFound(
            'Nobody has signed up with that email yet. Send them an invite link instead.'
        );
    }
    await addIfNew(teamId, target, role);
};

/** Owners (and super admins) promote and demote; the owner's role is fixed. */
export const changeMemberRole = async (
    teamId: number,
    userSub: string,
    targetUserId: number,
    role: unknown
) => {
    await requireOwner(teamId, userSub);
    if (!isAssignableRole(role)) {
        throw new AppError(400, 'role must be admin or member');
    }
    const target = await teamRepository.findMember(teamId, targetUserId);
    if (!target) throw notFound('That person is not in the team');
    if (target.role === 'owner') {
        throw new AppError(
            400,
            "Hand the team over to change the owner's role"
        );
    }
    await teamRepository.updateMemberRole(teamId, targetUserId, role);
};

/**
 * Removes a member, or lets someone leave. Admins can remove plain members,
 * owners can remove anyone but themselves, and the owner has to hand the
 * team over (or delete it) before leaving.
 */
export const removeMember = async (
    teamId: number,
    userSub: string,
    targetUserId: number
) => {
    const access = await getAccess(teamId, userSub);
    const target = await teamRepository.findMember(teamId, targetUserId);
    if (!target) throw notFound('That person is not in the team');

    if (target.role === 'owner') {
        throw new AppError(
            400,
            'The owner cannot leave. Hand the team over or delete it.'
        );
    }
    const leaving = targetUserId === access.user.user_id;
    if (!leaving) {
        if (!access.isManager) {
            throw new AppError(403, 'Only a team owner or admin can do that');
        }
        if (target.role === 'admin' && !access.isOwner) {
            throw new AppError(403, 'Only the team owner can remove an admin');
        }
    }
    await teamRepository.removeMember(teamId, targetUserId);
};

/** The owner makes another member the owner and becomes an admin. */
export const transferOwnership = async (
    teamId: number,
    userSub: string,
    targetUserId: number
) => {
    await requireOwner(teamId, userSub);
    const target = await teamRepository.findMember(teamId, targetUserId);
    if (!target) throw notFound('That person is not in the team');
    if (target.role === 'owner') {
        throw new AppError(400, 'They already own this team');
    }
    const members = await teamRepository.findMembers(teamId);
    const currentOwner = members.find((m) => m.role === 'owner');
    // the owner slot is unique, so free it before filling it
    if (currentOwner) {
        await teamRepository.updateMemberRole(
            teamId,
            currentOwner.user.user_id,
            'admin'
        );
    }
    await teamRepository.updateMemberRole(teamId, targetUserId, 'owner');
};

const newToken = () => randomBytes(24).toString('base64url');

const inviteStatus = (invite: TeamInvite) => {
    if (invite.revoked_at) return 'revoked';
    if (new Date(invite.expires_at).getTime() <= Date.now()) return 'expired';
    return 'active';
};

export const createInvite = async (
    teamId: number,
    userSub: string,
    role: unknown = 'member',
    expiresInDays: unknown = DEFAULT_INVITE_DAYS
) => {
    const access = await requireManager(teamId, userSub);
    if (!isAssignableRole(role)) {
        throw new AppError(400, 'role must be admin or member');
    }
    assertCanGrant(access, role);
    if (
        typeof expiresInDays !== 'number' ||
        !Number.isInteger(expiresInDays) ||
        expiresInDays < 1 ||
        expiresInDays > MAX_INVITE_DAYS
    ) {
        throw new AppError(
            400,
            `expiresInDays must be a whole number from 1 to ${MAX_INVITE_DAYS}`
        );
    }
    return teamRepository.createInvite({
        token: newToken(),
        team_id: teamId,
        role,
        created_by: access.user.user_id,
        expires_at: new Date(
            Date.now() + expiresInDays * 24 * 60 * 60 * 1000
        ).toISOString(),
    });
};

export const getInvites = async (teamId: number, userSub: string) => {
    await requireManager(teamId, userSub);
    return teamRepository.findActiveInvites(teamId);
};

export const revokeInvite = async (
    teamId: number,
    userSub: string,
    inviteId: number
) => {
    await requireManager(teamId, userSub);
    await teamRepository.revokeInvite(teamId, inviteId);
};

const loadUsableInvite = async (token: string) => {
    const invite = await teamRepository.findInviteByToken(token);
    // the same answer for unknown, revoked and expired links
    if (!invite || inviteStatus(invite) !== 'active') {
        throw new AppError(410, 'This invite link is no longer valid');
    }
    return invite;
};

/** What a link would add the user to, so they can confirm before joining. */
export const previewInvite = async (token: string, userSub: string) => {
    const user = await getUserBySub(userSub);
    const invite = await loadUsableInvite(token);
    const team = await loadTeam(invite.team_id);
    const existing = await teamRepository.findMember(
        team.team_id,
        user.user_id
    );
    return {
        teamId: team.team_id,
        teamName: team.name,
        role: invite.role,
        alreadyMember: !!existing,
    };
};

/** Joins the team with the invite's role. Existing members keep their role. */
export const acceptInvite = async (token: string, userSub: string) => {
    const user = await getUserBySub(userSub);
    const invite = await loadUsableInvite(token);
    const existing = await teamRepository.findMember(
        invite.team_id,
        user.user_id
    );
    if (!existing) {
        await teamRepository.addMember(
            invite.team_id,
            user.user_id,
            invite.role
        );
    }
    return { teamId: invite.team_id };
};
