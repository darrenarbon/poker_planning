import { Holiday } from '../../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** A date as the local calendar day, YYYY-MM-DD */
export const toDay = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const addDays = (day: string, days: number): string => {
    const date = new Date(`${day}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDay(date);
};

/**
 * The leave to look forward to: the one under way or the next to start.
 * Bank holidays and sickness are not planned leave, so they are skipped.
 */
export const nextLeave = (
    holidays: Holiday[],
    now = new Date()
): Holiday | undefined => {
    const today = toDay(now);
    return holidays
        .filter(
            (h) =>
                h.endDate >= today &&
                h.reason !== 'bank_holiday' &&
                h.reason !== 'sickness'
        )
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
};

/** Whole days from today until a day: 0 for today, negative if it has passed */
export const daysUntil = (day: string, now = new Date()): number =>
    Math.round(
        (new Date(`${day}T00:00:00`).getTime() -
            new Date(`${toDay(now)}T00:00:00`).getTime()) /
            86_400_000
    );
