import { describe, expect, it } from 'vitest';
import { memberName, tokenFromInvite } from './teamLabels';

describe('tokenFromInvite', () => {
    it('takes the token from a pasted link', () => {
        expect(
            tokenFromInvite('https://teamdeck.app/invite/abc_DEF-123?x=1')
        ).toBe('abc_DEF-123');
    });

    it('accepts a bare token and trims spaces', () => {
        expect(tokenFromInvite('  abc123  ')).toBe('abc123');
    });
});

describe('memberName', () => {
    const base = {
        userId: 1,
        sub: 's',
        role: 'member',
        joinedAt: '',
        jobTitle: null,
    } as const;

    it('prefers the full name, then nickname, then email', () => {
        expect(
            memberName({ ...base, givenName: 'Ada', familyName: 'Lovelace' })
        ).toBe('Ada Lovelace');
        expect(memberName({ ...base, nickname: 'ada' })).toBe('ada');
        expect(memberName({ ...base, email: 'a@b.com' })).toBe('a@b.com');
    });
});
