import { describe, expect, it } from 'vitest';

import type { Holiday } from '../../../types/models.js';
import {
    forecastCapacity,
    personAvailability,
    summariseVelocity,
    workingDays,
} from './capacity.js';

const holiday = (overrides: Partial<Holiday> = {}): Holiday => ({
    holiday_id: 1,
    user_id: 1,
    start_date: '2026-11-03',
    end_date: '2026-11-03',
    day_part: 'full',
    reason: 'annual_leave',
    note: null,
    created_by: 1,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
});

// Mon 2 Nov 2026 to Fri 13 Nov 2026
const days = workingDays('2026-11-02', '2026-11-13');

describe('workingDays', () => {
    it('is Monday to Friday only, inclusive', () => {
        expect(days).toHaveLength(10);
        expect(days[0]).toBe('2026-11-02');
        expect(days).not.toContain('2026-11-07');
        expect(days).not.toContain('2026-11-08');
    });

    it('is empty for a weekend', () => {
        expect(workingDays('2026-11-07', '2026-11-08')).toEqual([]);
    });
});

describe('personAvailability', () => {
    it('is all working days with no leave', () => {
        expect(personAvailability([], days)).toEqual({
            leaveDays: 0,
            availableDays: 10,
        });
    });

    it('takes off full days, skipping weekends in a range', () => {
        const away = holiday({
            start_date: '2026-11-05',
            end_date: '2026-11-10',
        });
        // Thu, Fri, Mon, Tue
        expect(personAvailability([away], days).leaveDays).toBe(4);
    });

    it('counts a half day as half', () => {
        expect(
            personAvailability([holiday({ day_part: 'am' })], days).leaveDays
        ).toBe(0.5);
    });

    it('does not count overlapping leave twice', () => {
        const result = personAvailability(
            [holiday(), holiday({ holiday_id: 2, reason: 'bank_holiday' })],
            days
        );
        expect(result.leaveDays).toBe(1);
    });

    it('makes a morning and an afternoon off a whole day', () => {
        const result = personAvailability(
            [
                holiday({ day_part: 'am' }),
                holiday({ holiday_id: 2, day_part: 'pm' }),
            ],
            days
        );
        expect(result.leaveDays).toBe(1);
    });

    it('ignores leave outside the sprint', () => {
        expect(
            personAvailability(
                [holiday({ start_date: '2026-12-01', end_date: '2026-12-01' })],
                days
            ).leaveDays
        ).toBe(0);
    });
});

const sprint = (endDate: string, completedPoints: number, days: number) => ({
    endDate,
    completedPoints,
    availablePersonDays: days,
});

describe('summariseVelocity', () => {
    it('gives no estimate from fewer than two sprints', () => {
        expect(summariseVelocity([sprint('2026-01-10', 30, 50)])).toMatchObject(
            { perPersonDay: null, confidence: 'none', sprintsUsed: 1 }
        );
    });

    it('is low confidence with two sprints and normal from three', () => {
        const two = [
            sprint('2026-01-10', 30, 50),
            sprint('2026-01-24', 20, 50),
        ];
        expect(summariseVelocity(two)).toMatchObject({
            perPersonDay: 0.5,
            lowPerPersonDay: 0.4,
            highPerPersonDay: 0.6,
            confidence: 'low',
        });
        expect(
            summariseVelocity([...two, sprint('2026-02-07', 25, 50)]).confidence
        ).toBe('normal');
    });

    it('pools points over person-days, so a short-staffed sprint weighs less', () => {
        const result = summariseVelocity([
            sprint('2026-01-10', 10, 10),
            sprint('2026-01-24', 40, 80),
        ]);
        expect(result.perPersonDay).toBe(0.556);
    });

    it('uses only the five most recent sprints', () => {
        const old = sprint('2025-01-01', 1000, 1);
        const recent = [1, 2, 3, 4, 5].map((n) =>
            sprint(`2026-01-0${n}`, 10, 10)
        );
        expect(summariseVelocity([old, ...recent])).toMatchObject({
            sprintsUsed: 5,
            perPersonDay: 1,
        });
    });

    it('skips sprints with no available days', () => {
        expect(
            summariseVelocity([
                sprint('2026-01-10', 10, 0),
                sprint('2026-01-24', 10, 10),
            ]).confidence
        ).toBe('none');
    });
});

describe('forecastCapacity', () => {
    const velocity = summariseVelocity([
        sprint('2026-01-10', 30, 50),
        sprint('2026-01-24', 20, 50),
        sprint('2026-02-07', 25, 50),
    ]);

    it('scales velocity by available days, takes off the buffer, then carry-over', () => {
        const forecast = forecastCapacity(velocity, 40, 10, 8);
        expect(forecast.capacityBeforeBuffer).toEqual({
            expected: 20,
            low: 16,
            high: 24,
        });
        expect(forecast.capacity).toEqual({
            expected: 18,
            low: 14.4,
            high: 21.6,
        });
        expect(forecast.newPoints).toEqual({
            expected: 10,
            low: 6.4,
            high: 13.6,
        });
    });

    it('never offers negative new points when carry-over exceeds capacity', () => {
        expect(forecastCapacity(velocity, 10, 0, 50).newPoints?.expected).toBe(
            0
        );
    });

    it('has no forecast without enough history', () => {
        const none = summariseVelocity([]);
        expect(forecastCapacity(none, 40, 0, 0)).toEqual({
            capacity: null,
            capacityBeforeBuffer: null,
            newPoints: null,
        });
    });
});
