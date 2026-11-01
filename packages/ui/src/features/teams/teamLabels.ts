import { JobTitle, TeamMemberInfo, TeamRole } from '../../types';

export const roleLabels: Record<TeamRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
};

export const jobTitleLabels: Record<JobTitle, string> = {
    developer: 'Developer',
    lead_developer: 'Lead Developer',
    product_manager: 'Product Manager',
    business_analyst: 'Business Analyst',
    qa_engineer: 'QA Engineer',
    engineering_manager: 'Engineering Manager',
    scrum_master: 'Scrum Master',
    designer: 'Designer',
    principal_developer: 'Principal Developer',
    other: 'Other',
};

/** A job title's label, or '' for none or one this version does not know */
export const jobTitleLabel = (jobTitle: string | null | undefined): string =>
    (jobTitle && jobTitleLabels[jobTitle as JobTitle]) || '';

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
