import type { Holiday } from '../../../types/models.js';

/** How many of the most recent closed sprints velocity is averaged over */
export const VELOCITY_SPRINTS = 5;
/** Fewest closed sprints before we offer an estimate at all */
export const MIN_SPRINTS_FOR_ESTIMATE = 2;
/** Fewest closed sprints before the estimate stops being flagged low confidence */
export const MIN_SPRINTS_FOR_CONFIDENCE = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

export const isDay = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    // rejects things like 2026-02-31, which Date would roll into March
    return toDate(value).toISOString().startsWith(value);
};

export const daysBetween = (from: string, to: string) =>
    Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS);

/** Monday to Friday between two days, inclusive. */
export const workingDays = (start: string, end: string): string[] => {
    const days: string[] = [];
    for (
        let time = toDate(start).getTime();
        time <= toDate(end).getTime();
        time += DAY_MS
    ) {
        const weekday = new Date(time).getUTCDay();
        if (weekday !== 0 && weekday !== 6) days.push(toDay(new Date(time)));
    }
    return days;
};

/** How much of a working day someone is away: 0 to 1, full days 1 and half days 0.5. */
const dayOff = (holidays: Holiday[], day: string): number => {
    let am = false;
    let pm = false;
    for (const h of holidays) {
        if (h.start_date > day || h.end_date < day) continue;
        if (h.day_part !== 'pm') am = true;
        if (h.day_part !== 'am') pm = true;
    }
    return (am ? 0.5 : 0) + (pm ? 0.5 : 0);
};

/**
 * Leave and availability for one person across a sprint's working days.
 * Overlapping holidays are not counted twice, and a day never goes below zero.
 */
export const personAvailability = (
    holidays: Holiday[],
    days: string[]
): { leaveDays: number; availableDays: number } => {
    const leaveDays = days.reduce((sum, day) => sum + dayOff(holidays, day), 0);
    return { leaveDays, availableDays: days.length - leaveDays };
};

export interface ClosedSprintFigures {
    endDate: string;
    completedPoints: number;
    availablePersonDays: number;
}

export type Confidence = 'none' | 'low' | 'normal';

export interface VelocitySummary {
    sprintsUsed: number;
    /** points completed per available person-day, pooled over the sprints used */
    perPersonDay: number | null;
    /** the worst and best single sprint, per person-day */
    lowPerPersonDay: number | null;
    highPerPersonDay: number | null;
    confidence: Confidence;
}

const round = (value: number, places = 2) => {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
};

/** Velocity per person-day from a team's closed sprints, using the most recent few. */
export const summariseVelocity = (
    closed: ClosedSprintFigures[]
): VelocitySummary => {
    const recent = closed
        .filter((s) => s.availablePersonDays > 0)
        .sort((a, b) => b.endDate.localeCompare(a.endDate))
        .slice(0, VELOCITY_SPRINTS);
    if (recent.length < MIN_SPRINTS_FOR_ESTIMATE) {
        return {
            sprintsUsed: recent.length,
            perPersonDay: null,
            lowPerPersonDay: null,
            highPerPersonDay: null,
            confidence: 'none',
        };
    }
    const points = recent.reduce((sum, s) => sum + s.completedPoints, 0);
    const days = recent.reduce((sum, s) => sum + s.availablePersonDays, 0);
    const each = recent.map((s) => s.completedPoints / s.availablePersonDays);
    return {
        sprintsUsed: recent.length,
        perPersonDay: round(points / days, 3),
        lowPerPersonDay: round(Math.min(...each), 3),
        highPerPersonDay: round(Math.max(...each), 3),
        confidence:
            recent.length >= MIN_SPRINTS_FOR_CONFIDENCE ? 'normal' : 'low',
    };
};

export interface PointsRange {
    expected: number;
    low: number;
    high: number;
}

const scale = (
    velocity: VelocitySummary,
    personDays: number,
    factor: number
): PointsRange | null => {
    if (
        velocity.perPersonDay === null ||
        velocity.lowPerPersonDay === null ||
        velocity.highPerPersonDay === null
    ) {
        return null;
    }
    return {
        expected: round(velocity.perPersonDay * personDays * factor, 1),
        low: round(velocity.lowPerPersonDay * personDays * factor, 1),
        high: round(velocity.highPerPersonDay * personDays * factor, 1),
    };
};

export interface CapacityForecast {
    /** what the team could take on in total, after holding the buffer back */
    capacity: PointsRange | null;
    /** the same before the buffer */
    capacityBeforeBuffer: PointsRange | null;
    /** what is left for new work once carried-over points are accounted for */
    newPoints: PointsRange | null;
}

export const forecastCapacity = (
    velocity: VelocitySummary,
    personDays: number,
    bufferPercent: number,
    carriedOverPoints: number
): CapacityForecast => {
    const capacity = scale(velocity, personDays, 1 - bufferPercent / 100);
    const newPoints = capacity && {
        expected: Math.max(0, round(capacity.expected - carriedOverPoints, 1)),
        low: Math.max(0, round(capacity.low - carriedOverPoints, 1)),
        high: Math.max(0, round(capacity.high - carriedOverPoints, 1)),
    };
    return {
        capacity,
        capacityBeforeBuffer: scale(velocity, personDays, 1),
        newPoints,
    };
};
