import { User } from '@auth0/auth0-react';
import { UserModel, UserProfile } from '../types';

/** Joins the names that are set, so a missing one never shows as "null" */
export const getFullName = (
    profile?: Partial<UserProfile>
): string | undefined =>
    [profile?.givenName, profile?.familyName].filter(Boolean).join(' ') ||
    undefined;

export const getDisplayName = (user: UserModel): string | undefined =>
    user.given_name
        ? getFullName({
              givenName: user.given_name,
              familyName: user.family_name,
          })
        : user.nickname;

/** Initials from the name the user chose; falls back to their login's nickname */
export const getInitials = (
    user?: User,
    profile?: UserProfile
): string | undefined => {
    const givenName = profile?.givenName || user?.given_name;
    const familyName = profile?.givenName
        ? profile.familyName
        : user?.family_name;
    return givenName
        ? `${givenName.substring(0, 1)}${familyName?.substring(0, 1) ?? ''}`
        : user?.nickname
              ?.split('.')
              .map((n) => n.substring(0, 1))
              .join('')
              .toUpperCase();
};
