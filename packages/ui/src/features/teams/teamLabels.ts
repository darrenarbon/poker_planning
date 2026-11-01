import { TeamMemberInfo, TeamRole } from '../../types';

export const roleLabels: Record<TeamRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
};

export const memberName = (member: TeamMemberInfo): string => {
    if (member.givenName) {
        return `${member.givenName} ${member.familyName ?? ''}`.trim();
    }
    return member.nickname || member.email || 'Unknown';
};

export const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
    });

/** Pulls the token out of a pasted invite link, or accepts the bare token */
export const tokenFromInvite = (value: string): string => {
    const trimmed = value.trim();
    const match = trimmed.match(/\/invite\/([^/?#\s]+)/);
    return match ? match[1] : trimmed;
};
