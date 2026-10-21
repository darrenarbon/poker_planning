import { User } from '@auth0/auth0-react';
import { UserModel } from '../types';

export const getDisplayName = (user: UserModel): string | undefined =>
    user.given_name ? `${user.given_name} ${user.family_name}` : user.nickname;

export const getInitials = (user?: User): string | undefined =>
    user?.given_name
        ? `${user.given_name.substring(0, 1)}${user.family_name?.substring(0, 1)}`
        : user?.nickname
              ?.split('.')
              .map((n) => n.substring(0, 1))
              .join('')
              .toUpperCase();
