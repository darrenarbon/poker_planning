import { describe, expect, it } from 'vitest';
import { makeAuthUser, makeUserModel } from '../test/factories';
import { getDisplayName, getInitials } from './user';

describe('getDisplayName', () => {
    it('uses given and family name when available', () => {
        expect(getDisplayName(makeUserModel())).toBe('Ada Lovelace');
    });

    it('falls back to the nickname', () => {
        expect(getDisplayName(makeUserModel({ given_name: undefined }))).toBe(
            'ada.lovelace'
        );
    });
});

describe('getInitials', () => {
    it('uses the first letters of given and family name', () => {
        expect(getInitials(makeAuthUser())).toBe('AL');
    });

    it('builds upper-case initials from a dotted nickname', () => {
        expect(
            getInitials(
                makeAuthUser({
                    given_name: undefined,
                    nickname: 'grace.hopper',
                })
            )
        ).toBe('GH');
    });

    it('returns undefined with no user', () => {
        expect(getInitials(undefined)).toBeUndefined();
    });
});
