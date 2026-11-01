export const HOLIDAY_REASONS = [
    'annual_leave',
    'sickness',
    'birthday_leave',
    'bank_holiday',
    'maternity_leave',
    'paternity_leave',
    'parental_leave',
    'compassionate_leave',
    'study_leave',
    'unpaid_leave',
    'jury_service',
    'other',
] as const;

export type HolidayReason = (typeof HOLIDAY_REASONS)[number];

/** Whether each day is off in full, or only the morning or afternoon */
export type HolidayDayPart = 'full' | 'am' | 'pm';

export const BANK_HOLIDAY_REGIONS = [
    'england-and-wales',
    'scotland',
    'northern-ireland',
    'spain',
    'india',
] as const;

export type BankHolidayRegion = (typeof BANK_HOLIDAY_REGIONS)[number];

/** A holiday as returned by GET /me/holidays. Dates are YYYY-MM-DD. */
export interface Holiday {
    holidayId: number;
    userId: number;
    startDate: string;
    endDate: string;
    dayPart: HolidayDayPart;
    reason: HolidayReason;
    note: string | null;
}

/** What is sent to add or change a holiday */
export interface HolidayInput {
    startDate: string;
    endDate: string;
    dayPart: HolidayDayPart;
    reason: HolidayReason;
    note?: string;
}

/** Someone in a team who is away for a session, from GET /teams/:teamId/absences */
export interface TeamAbsence {
    userId: number;
    sub: string;
    reason: HolidayReason;
    dayPart: HolidayDayPart;
    startDate: string;
    endDate: string;
}

/** Someone's leave in a team, from GET /teams/:teamId/leave */
export interface TeamLeave extends Holiday {
    sub: string;
}
