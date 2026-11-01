import { describe, expect, it } from 'vitest';
import { formatDayRange, sessionDayAndPart } from './holidayLabels';

describe('sessionDayAndPart', () => {
    it('gives the local day and whether it is before or after midday', () => {
        expect(sessionDayAndPart('2026-12-25T09:30')).toEqual({
            date: '2026-12-25',
            part: 'am',
        });
        expect(sessionDayAndPart('2026-12-25T12:00')).toEqual({
            date: '2026-12-25',
            part: 'pm',
        });
    });

    it('is null for an empty value', () => {
        expect(sessionDayAndPart('')).toBeNull();
    });
});

describe('formatDayRange', () => {
    it('shows one day or a range', () => {
        // ICU versions differ on the comma after the weekday
        const plain = (text: string) => text.replace(/,/g, '');
        expect(plain(formatDayRange('2026-12-25', '2026-12-25'))).toBe(
            'Fri 25 Dec 2026'
        );
        expect(plain(formatDayRange('2026-12-24', '2026-12-31'))).toBe(
            'Thu 24 Dec – Thu 31 Dec 2026'
        );
    });
});
