import { describe, expect, it } from 'vitest';
import { Holiday } from '../../types';
import { addDays, daysUntil, nextLeave, toDay } from './leaveDates';

const leave = (overrides: Partial<Holiday>): Holiday => ({
    holidayId: 1,
    userId: 1,
    startDate: '2026-12-24',
    endDate: '2026-12-31',
    dayPart: 'full',
    reason: 'annual_leave',
    note: null,
    ...overrides,
});

const now = new Date(2026, 11, 1, 10);

describe('nextLeave', () => {
    it('picks leave under way or the soonest to start', () => {
        const later = leave({
            holidayId: 2,
            startDate: '2027-02-01',
            endDate: '2027-02-05',
        });
        const soon = leave({
            holidayId: 3,
            startDate: '2026-12-10',
            endDate: '2026-12-11',
        });
        const underWay = leave({
            holidayId: 4,
            startDate: '2026-11-30',
            endDate: '2026-12-02',
        });
        expect(nextLeave([later, soon], now)).toBe(soon);
        expect(nextLeave([later, soon, underWay], now)).toBe(underWay);
    });

    it('skips finished leave, bank holidays and sickness', () => {
        expect(
            nextLeave(
                [
                    leave({ endDate: '2026-11-30', startDate: '2026-11-20' }),
                    leave({ reason: 'bank_holiday' }),
                    leave({ reason: 'sickness' }),
                ],
                now
            )
        ).toBeUndefined();
    });
});

describe('day helpers', () => {
    it('adds days and counts them', () => {
        expect(toDay(now)).toBe('2026-12-01');
        expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
        expect(daysUntil('2026-12-01', now)).toBe(0);
        expect(daysUntil('2026-12-11', now)).toBe(10);
        expect(daysUntil('2026-11-29', now)).toBe(-2);
    });
});
