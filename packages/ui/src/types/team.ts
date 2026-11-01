export type TeamRole = 'owner' | 'admin' | 'member';

/** A role someone can be given: ownership is handed over, not assigned */
export type AssignableTeamRole = Exclude<TeamRole, 'owner'>;

/** A team as returned by GET /me/teams */
export interface UserTeam {
    team_id: number;
    name: string;
    created_at: string;
    /** the user's role, null for a super admin who is not in the team */
    role: TeamRole | null;
    member_count: number;
}

export interface MyTeams {
    teams: UserTeam[];
    /** can see and manage every team and room */
    isSuperAdmin: boolean;
}

export interface TeamMemberInfo {
    userId: number;
    sub: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    nickname?: string;
    picture?: string;
    role: TeamRole;
    joinedAt: string;
}

/** A team as returned by GET /teams/:teamId */
export interface TeamDetails {
    team: { team_id: number; name: string; created_at: string };
    myRole: TeamRole | null;
    isSuperAdmin: boolean;
    /** owner, admin or super admin: can add and remove members and invite */
    canManage: boolean;
    /** owner or super admin: can change roles, hand over or delete */
    canChangeRoles: boolean;
    members: TeamMemberInfo[];
}

export interface TeamInvite {
    invite_id: number;
    token: string;
    team_id: number;
    role: AssignableTeamRole;
    created_at: string;
    expires_at: string;
}

/** What an invite link would add the user to */
export interface InvitePreview {
    teamId: number;
    teamName: string;
    role: AssignableTeamRole;
    alreadyMember: boolean;
}

/** Who a new room goes to, picked from its team */
export interface NewRoomOptions {
    teamId: number;
    memberSubs: string[];
    coFacilitatorSubs: string[];
}
