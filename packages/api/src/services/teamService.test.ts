import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as teamRepository from '../repositories/teamRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import {
    makeTeam,
    makeTeamInvite,
    makeTeamMember,
    makeUser,
} from '../test/factories.js';
import {
    acceptInvite,
    addMemberByEmail,
    canManageTeam,
    changeMemberRole,
    createInvite,
    createTeam,
    deleteTeam,
    getManagedTeamIds,
    getTeamDetails,
    getTeamsForUser,
    previewInvite,
    removeMember,
    renameTeam,
    transferOwnership,
} from './teamService.js';

vi.mock('../repositories/teamRepository.js');
vi.mock('../repositories/userRepository.js');

const team = makeTeam();
const owner = makeUser({ user_id: 1, auth0_sub: 'auth0|owner' });
const admin = makeUser({ user_id: 2, auth0_sub: 'auth0|admin' });
const member = makeUser({ user_id: 3, auth0_sub: 'auth0|member' });
const outsider = makeUser({ user_id: 4, auth0_sub: 'auth0|outsider' });
const superAdmin = makeUser({
    user_id: 5,
    auth0_sub: 'auth0|super',
    is_super_admin: true,
});

const roles: Record<number, 'owner' | 'admin' | 'member'> = {
    [owner.user_id]: 'owner',
    [admin.user_id]: 'admin',
    [member.user_id]: 'member',
};

beforeEach(() => {
    const users = [owner, admin, member, outsider, superAdmin];
    vi.mocked(userRepository.findUserBySub).mockImplementation(async (sub) =>
        users.find((u) => u.auth0_sub === sub)
    );
    vi.mocked(teamRepository.findTeamById).mockResolvedValue(team);
    vi.mocked(teamRepository.findMember).mockImplementation(
        async (teamId, userId) =>
            roles[userId]
                ? makeTeamMember({
                      team_id: teamId,
                      user_id: userId,
                      role: roles[userId],
                  })
                : undefined
    );
});

describe('createTeam', () => {
    it('creates the team and makes the creator its owner', async () => {
        vi.mocked(teamRepository.createTeam).mockResolvedValue(team);
        await expect(createTeam(owner.auth0_sub, '  Platform ')).resolves.toBe(
            team
        );
        expect(teamRepository.createTeam).toHaveBeenCalledWith('Platform');
        expect(teamRepository.addMember).toHaveBeenCalledWith(
            team.team_id,
            owner.user_id,
            'owner'
        );
    });

    it('rejects a blank or very long name with 400', async () => {
        await expect(createTeam(owner.auth0_sub, '  ')).rejects.toMatchObject({
            status: 400,
        });
        await expect(
            createTeam(owner.auth0_sub, 'x'.repeat(81))
        ).rejects.toMatchObject({ status: 400 });
        expect(teamRepository.createTeam).not.toHaveBeenCalled();
    });
});

describe('getTeamsForUser', () => {
    it('lists the teams the user is in with their role and size', async () => {
        vi.mocked(teamRepository.findMembershipsForUser).mockResolvedValue([
            { role: 'admin', team },
        ]);
        vi.mocked(teamRepository.countMembers).mockResolvedValue(
            new Map([[team.team_id, 4]])
        );
        await expect(getTeamsForUser(admin.auth0_sub)).resolves.toEqual({
            isSuperAdmin: false,
            teams: [{ ...team, role: 'admin', member_count: 4 }],
        });
    });

    it('lists every team for a super admin, with no role where they are not in it', async () => {
        vi.mocked(teamRepository.findMembershipsForUser).mockResolvedValue([]);
        vi.mocked(teamRepository.findAllTeams).mockResolvedValue([team]);
        vi.mocked(teamRepository.countMembers).mockResolvedValue(new Map());
        await expect(getTeamsForUser(superAdmin.auth0_sub)).resolves.toEqual({
            isSuperAdmin: true,
            teams: [{ ...team, role: null, member_count: 0 }],
        });
    });
});

describe('getTeamDetails', () => {
    beforeEach(() => {
        vi.mocked(teamRepository.findMembers).mockResolvedValue([
            { role: 'owner', joined_at: 'j', user: owner },
        ]);
    });

    it('shows members to anyone in the team', async () => {
        const details = await getTeamDetails(team.team_id, member.auth0_sub);
        expect(details).toMatchObject({
            myRole: 'member',
            canManage: false,
            canChangeRoles: false,
            members: [{ sub: owner.auth0_sub, role: 'owner' }],
        });
    });

    it('lets admins manage but not change roles', async () => {
        const details = await getTeamDetails(team.team_id, admin.auth0_sub);
        expect(details).toMatchObject({
            canManage: true,
            canChangeRoles: false,
        });
    });

    it('lets a super admin in without being a member', async () => {
        const details = await getTeamDetails(
            team.team_id,
            superAdmin.auth0_sub
        );
        expect(details).toMatchObject({
            myRole: null,
            isSuperAdmin: true,
            canManage: true,
            canChangeRoles: true,
        });
    });

    it('hides the team from outsiders with 404', async () => {
        await expect(
            getTeamDetails(team.team_id, outsider.auth0_sub)
        ).rejects.toMatchObject({ status: 404 });
    });

    it('404s for a team that does not exist', async () => {
        vi.mocked(teamRepository.findTeamById).mockResolvedValue(undefined);
        await expect(getTeamDetails(99, owner.auth0_sub)).rejects.toMatchObject(
            { status: 404 }
        );
    });
});

describe('renameTeam and deleteTeam', () => {
    it('lets admins rename', async () => {
        await renameTeam(team.team_id, admin.auth0_sub, 'New');
        expect(teamRepository.updateTeamName).toHaveBeenCalledWith(
            team.team_id,
            'New'
        );
    });

    it('stops plain members renaming', async () => {
        await expect(
            renameTeam(team.team_id, member.auth0_sub, 'New')
        ).rejects.toMatchObject({ status: 403 });
    });

    it('lets only the owner or a super admin delete', async () => {
        await expect(
            deleteTeam(team.team_id, admin.auth0_sub)
        ).rejects.toMatchObject({ status: 403 });
        await deleteTeam(team.team_id, owner.auth0_sub);
        await deleteTeam(team.team_id, superAdmin.auth0_sub);
        expect(teamRepository.deleteTeam).toHaveBeenCalledTimes(2);
    });
});

describe('addMemberByEmail', () => {
    beforeEach(() => {
        vi.mocked(userRepository.findUserByEmail).mockResolvedValue(outsider);
    });

    it('lets an admin add a plain member', async () => {
        await addMemberByEmail(
            team.team_id,
            admin.auth0_sub,
            ' o@example.com ',
            'member'
        );
        expect(userRepository.findUserByEmail).toHaveBeenCalledWith(
            'o@example.com'
        );
        expect(teamRepository.addMember).toHaveBeenCalledWith(
            team.team_id,
            outsider.user_id,
            'member'
        );
    });

    it('lets an admin add only members, not admins', async () => {
        await expect(
            addMemberByEmail(team.team_id, admin.auth0_sub, 'x@y.z', 'admin')
        ).rejects.toMatchObject({ status: 403 });
        await addMemberByEmail(team.team_id, owner.auth0_sub, 'x@y.z', 'admin');
        expect(teamRepository.addMember).toHaveBeenCalledWith(
            team.team_id,
            outsider.user_id,
            'admin'
        );
    });

    it('does not allow adding an owner', async () => {
        await expect(
            addMemberByEmail(team.team_id, owner.auth0_sub, 'x@y.z', 'owner')
        ).rejects.toMatchObject({ status: 400 });
    });

    it('stops plain members adding people', async () => {
        await expect(
            addMemberByEmail(team.team_id, member.auth0_sub, 'x@y.z')
        ).rejects.toMatchObject({ status: 403 });
    });

    it('tells the admin when nobody has that email', async () => {
        vi.mocked(userRepository.findUserByEmail).mockResolvedValue(undefined);
        await expect(
            addMemberByEmail(team.team_id, owner.auth0_sub, 'no@one.com')
        ).rejects.toMatchObject({ status: 404 });
    });

    it('refuses someone already in the team with 409', async () => {
        vi.mocked(userRepository.findUserByEmail).mockResolvedValue(member);
        await expect(
            addMemberByEmail(team.team_id, owner.auth0_sub, 'm@example.com')
        ).rejects.toMatchObject({ status: 409 });
        expect(teamRepository.addMember).not.toHaveBeenCalled();
    });

    it('requires an email', async () => {
        await expect(
            addMemberByEmail(team.team_id, owner.auth0_sub, '')
        ).rejects.toMatchObject({ status: 400 });
    });
});

describe('changeMemberRole', () => {
    it('lets the owner promote and demote', async () => {
        await changeMemberRole(
            team.team_id,
            owner.auth0_sub,
            member.user_id,
            'admin'
        );
        expect(teamRepository.updateMemberRole).toHaveBeenCalledWith(
            team.team_id,
            member.user_id,
            'admin'
        );
    });

    it('stops admins changing roles', async () => {
        await expect(
            changeMemberRole(
                team.team_id,
                admin.auth0_sub,
                member.user_id,
                'admin'
            )
        ).rejects.toMatchObject({ status: 403 });
    });

    it("never changes the owner's role directly", async () => {
        await expect(
            changeMemberRole(
                team.team_id,
                superAdmin.auth0_sub,
                owner.user_id,
                'member'
            )
        ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects owner as a role and unknown people', async () => {
        await expect(
            changeMemberRole(
                team.team_id,
                owner.auth0_sub,
                member.user_id,
                'owner'
            )
        ).rejects.toMatchObject({ status: 400 });
        await expect(
            changeMemberRole(
                team.team_id,
                owner.auth0_sub,
                outsider.user_id,
                'admin'
            )
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe('removeMember', () => {
    it('lets an admin remove a plain member', async () => {
        await removeMember(team.team_id, admin.auth0_sub, member.user_id);
        expect(teamRepository.removeMember).toHaveBeenCalledWith(
            team.team_id,
            member.user_id
        );
    });

    it('stops an admin removing another admin', async () => {
        const otherAdmin = makeUser({ user_id: 6, auth0_sub: 'auth0|admin2' });
        roles[6] = 'admin';
        vi.mocked(userRepository.findUserBySub).mockResolvedValue(admin);
        await expect(
            removeMember(team.team_id, admin.auth0_sub, otherAdmin.user_id)
        ).rejects.toMatchObject({ status: 403 });
        delete roles[6];
    });

    it('lets the owner remove an admin', async () => {
        await removeMember(team.team_id, owner.auth0_sub, admin.user_id);
        expect(teamRepository.removeMember).toHaveBeenCalled();
    });

    it('lets a member leave but stops them removing others', async () => {
        await removeMember(team.team_id, member.auth0_sub, member.user_id);
        expect(teamRepository.removeMember).toHaveBeenCalledWith(
            team.team_id,
            member.user_id
        );
        await expect(
            removeMember(team.team_id, member.auth0_sub, admin.user_id)
        ).rejects.toMatchObject({ status: 403 });
    });

    it('does not let the owner be removed or leave', async () => {
        await expect(
            removeMember(team.team_id, owner.auth0_sub, owner.user_id)
        ).rejects.toMatchObject({ status: 400 });
        await expect(
            removeMember(team.team_id, superAdmin.auth0_sub, owner.user_id)
        ).rejects.toMatchObject({ status: 400 });
    });
});

describe('transferOwnership', () => {
    beforeEach(() => {
        vi.mocked(teamRepository.findMembers).mockResolvedValue([
            { role: 'owner', joined_at: 'j', user: owner },
            { role: 'member', joined_at: 'j', user: member },
        ]);
    });

    it('demotes the owner to admin before promoting the new one', async () => {
        await transferOwnership(team.team_id, owner.auth0_sub, member.user_id);
        expect(teamRepository.updateMemberRole).toHaveBeenNthCalledWith(
            1,
            team.team_id,
            owner.user_id,
            'admin'
        );
        expect(teamRepository.updateMemberRole).toHaveBeenNthCalledWith(
            2,
            team.team_id,
            member.user_id,
            'owner'
        );
    });

    it('is for the owner (or a super admin) only', async () => {
        await expect(
            transferOwnership(team.team_id, admin.auth0_sub, member.user_id)
        ).rejects.toMatchObject({ status: 403 });
    });

    it('needs the new owner to be in the team', async () => {
        await expect(
            transferOwnership(team.team_id, owner.auth0_sub, outsider.user_id)
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe('createInvite', () => {
    it('creates an expiring member invite with an unguessable token', async () => {
        vi.mocked(teamRepository.createInvite).mockImplementation(
            async (invite) => makeTeamInvite(invite)
        );
        const before = Date.now();
        const invite = await createInvite(team.team_id, admin.auth0_sub);
        const [call] = vi.mocked(teamRepository.createInvite).mock.calls[0];
        expect(call.token.length).toBeGreaterThanOrEqual(30);
        expect(call).toMatchObject({
            team_id: team.team_id,
            role: 'member',
            created_by: admin.user_id,
        });
        const expires = new Date(call.expires_at).getTime();
        expect(expires).toBeGreaterThan(before + 6.9 * 24 * 3600 * 1000);
        expect(invite.team_id).toBe(team.team_id);
    });

    it('lets only owners make admin invites', async () => {
        await expect(
            createInvite(team.team_id, admin.auth0_sub, 'admin', 7)
        ).rejects.toMatchObject({ status: 403 });
    });

    it('stops plain members creating invites', async () => {
        await expect(
            createInvite(team.team_id, member.auth0_sub)
        ).rejects.toMatchObject({ status: 403 });
    });

    it('validates the expiry', async () => {
        for (const days of [0, 91, 1.5, '7']) {
            await expect(
                createInvite(team.team_id, owner.auth0_sub, 'member', days)
            ).rejects.toMatchObject({ status: 400 });
        }
    });
});

describe('invites by link', () => {
    it('shows what the link would join', async () => {
        vi.mocked(teamRepository.findInviteByToken).mockResolvedValue(
            makeTeamInvite()
        );
        await expect(
            previewInvite('tok-abc', outsider.auth0_sub)
        ).resolves.toEqual({
            teamId: team.team_id,
            teamName: team.name,
            role: 'member',
            alreadyMember: false,
        });
    });

    it('adds the user with the role on the invite', async () => {
        vi.mocked(teamRepository.findInviteByToken).mockResolvedValue(
            makeTeamInvite({ role: 'admin' })
        );
        await expect(
            acceptInvite('tok-abc', outsider.auth0_sub)
        ).resolves.toEqual({ teamId: team.team_id });
        expect(teamRepository.addMember).toHaveBeenCalledWith(
            team.team_id,
            outsider.user_id,
            'admin'
        );
    });

    it('leaves an existing members role alone', async () => {
        vi.mocked(teamRepository.findInviteByToken).mockResolvedValue(
            makeTeamInvite({ role: 'admin' })
        );
        await acceptInvite('tok-abc', member.auth0_sub);
        expect(teamRepository.addMember).not.toHaveBeenCalled();
        expect(teamRepository.updateMemberRole).not.toHaveBeenCalled();
    });

    it.each([
        ['unknown', undefined],
        ['revoked', makeTeamInvite({ revoked_at: '2026-01-02T00:00:00Z' })],
        ['expired', makeTeamInvite({ expires_at: '2000-01-01T00:00:00Z' })],
    ])('refuses a %s link with 410', async (_name, invite) => {
        vi.mocked(teamRepository.findInviteByToken).mockResolvedValue(invite);
        await expect(
            acceptInvite('tok-abc', outsider.auth0_sub)
        ).rejects.toMatchObject({ status: 410 });
        await expect(
            previewInvite('tok-abc', outsider.auth0_sub)
        ).rejects.toMatchObject({ status: 410 });
        expect(teamRepository.addMember).not.toHaveBeenCalled();
    });
});

describe('team access helpers', () => {
    it('canManageTeam is true for owner, admin and super admin only', async () => {
        expect(await canManageTeam(owner, 50)).toBe(true);
        expect(await canManageTeam(admin, 50)).toBe(true);
        expect(await canManageTeam(superAdmin, 50)).toBe(true);
        expect(await canManageTeam(member, 50)).toBe(false);
        expect(await canManageTeam(outsider, 50)).toBe(false);
    });

    it('getManagedTeamIds is every team for a super admin', async () => {
        vi.mocked(teamRepository.findAllTeams).mockResolvedValue([team]);
        vi.mocked(teamRepository.findManagedTeamIds).mockResolvedValue([7]);
        expect(await getManagedTeamIds(superAdmin)).toEqual([team.team_id]);
        expect(await getManagedTeamIds(admin)).toEqual([7]);
    });
});
