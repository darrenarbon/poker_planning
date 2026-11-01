import { describe, expect, it } from 'vitest';
import {
    dayLabel,
    defaultSchedule,
    formatTime,
    formatSchedule,
    fromLocalInputValue,
    toLocalInputValue,
} from './dateTime';

describe('toLocalInputValue / fromLocalInputValue', () => {
    it('round-trips a local time', () => {
        const iso = fromLocalInputValue('2030-05-01T09:30');
        expect(iso).toBe(new Date('2030-05-01T09:30').toISOString());
        expect(toLocalInputValue(iso!)).toBe('2030-05-01T09:30');
    });

    it('pads single digits', () => {
        expect(toLocalInputValue(new Date(2030, 0, 2, 3, 4))).toBe(
            '2030-01-02T03:04'
        );
    });

    it('gives null for an empty or invalid value', () => {
        expect(fromLocalInputValue('')).toBeNull();
        expect(fromLocalInputValue('nonsense')).toBeNull();
    });
});

describe('defaultSchedule', () => {
    it('rounds up to the next half hour', () => {
        expect(defaultSchedule(new Date(2030, 4, 1, 9, 5, 20))).toBe(
            '2030-05-01T09:30'
        );
        expect(defaultSchedule(new Date(2030, 4, 1, 9, 30, 0))).toBe(
            '2030-05-01T10:00'
        );
        expect(defaultSchedule(new Date(2030, 4, 1, 23, 45))).toBe(
            '2030-05-02T00:00'
        );
    });
});

describe('formatSchedule', () => {
    const now = new Date(2030, 0, 1);

    it('leaves the year off for this year', () => {
        const text = formatSchedule(
            new Date(2030, 4, 1, 9, 30).toISOString(),
            now
        );
        expect(text).toContain('09:30');
        expect(text).not.toContain('2030');
    });

    it('adds the year for other years', () => {
        expect(
            formatSchedule(new Date(2031, 4, 1, 9, 30).toISOString(), now)
        ).toContain('2031');
    });

    it('is empty for a bad date', () => {
        expect(formatSchedule('nope', now)).toBe('');
    });
});

describe('dayLabel', () => {
    const now = new Date(2030, 4, 1, 23, 30);

    it('says Today and Tomorrow by calendar day, not by hours', () => {
        expect(dayLabel(new Date(2030, 4, 1, 0, 5).toISOString(), now)).toBe(
            'Today'
        );
        expect(dayLabel(new Date(2030, 4, 2, 0, 5).toISOString(), now)).toBe(
            'Tomorrow'
        );
    });

    it('names later days, with the year when it is not this one', () => {
        expect(dayLabel(new Date(2030, 4, 5).toISOString(), now)).toMatch(
            /May/
        );
        expect(dayLabel(new Date(2031, 4, 5).toISOString(), now)).toContain(
            '2031'
        );
    });

    it('is empty for a bad date', () => {
        expect(dayLabel('nope', now)).toBe('');
    });
});

describe('formatTime', () => {
    it('shows hours and minutes', () => {
        expect(formatTime(new Date(2030, 4, 1, 9, 5).toISOString())).toBe(
            '09:05'
        );
        expect(formatTime('nope')).toBe('');
    });
});
