import * as holidayRepository from '../repositories/holidayRepository.js';
import * as teamRepository from '../repositories/teamRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { HOLIDAY_DAY_PARTS, HOLIDAY_REASONS } from '../types/models.js';
import type {
    Holiday,
    HolidayDayPart,
    HolidayInput,
    HolidayReason,
    User,
} from '../types/models.js';
import { env } from '../config/env.js';
import { AppError, notFound } from '../utils/errors.js';
import { getAccess } from './teamService.js';
import { getUserBySub } from './userService.js';

const MAX_NOTE_LENGTH = 200;
const MAX_RANGE_DAYS = 366;

export const BANK_HOLIDAY_URL = 'https://www.gov.uk/bank-holidays.json';
const NAGER_URL = 'https://date.nager.at/api/v3/PublicHolidays';
const CALENDARIFIC_URL = 'https://calendarific.com/api/v2/holidays';

/** Where each region's bank holidays come from. All free; India needs a key. */
const REGION_SOURCES = {
    'england-and-wales': { source: 'gov.uk' },
    scotland: { source: 'gov.uk' },
    'northern-ireland': { source: 'gov.uk' },
    spain: { source: 'nager', country: 'ES' },
    india: { source: 'calendarific', country: 'IN' },
} as const;

export const BANK_HOLIDAY_REGIONS = Object.keys(
    REGION_SOURCES
) as (keyof typeof REGION_SOURCES)[];
export type BankHolidayRegion = keyof typeof REGION_SOURCES;

/** Spain's autonomous communities and cities, which have their own holidays */
export const SPAIN_SUBDIVISIONS = [
    'ES-AN',
    'ES-AR',
    'ES-AS',
    'ES-CB',
    'ES-CE',
    'ES-CL',
    'ES-CM',
    'ES-CN',
    'ES-CT',
    'ES-EX',
    'ES-GA',
    'ES-IB',
    'ES-MC',
    'ES-MD',
    'ES-ML',
    'ES-NC',
    'ES-PV',
    'ES-RI',
    'ES-VC',
];

const DAY_MS = 24 * 60 * 60 * 1000;

const isDay = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    // rejects things like 2026-02-31, which Date would roll into March
    return new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
};

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

/** Checks a request body and keeps only the fields a holiday has. */
export const parseHoliday = (body: unknown): HolidayInput => {
    const { startDate, endDate, dayPart, reason, note } = (body ??
        {}) as Record<string, unknown>;
    if (!isDay(startDate)) {
        throw new AppError(400, 'startDate must be a date like 2026-12-24');
    }
    const end = endDate === undefined ? startDate : endDate;
    if (!isDay(end)) {
        throw new AppError(400, 'endDate must be a date like 2026-12-24');
    }
    if (end < startDate) {
        throw new AppError(400, 'endDate cannot be before startDate');
    }
    if (dayNumber(end) - dayNumber(startDate) >= MAX_RANGE_DAYS) {
        throw new AppError(
            400,
            `A holiday can be at most ${MAX_RANGE_DAYS} days long`
        );
    }
    const part = dayPart ?? 'full';
    if (!HOLIDAY_DAY_PARTS.includes(part as HolidayDayPart)) {
        throw new AppError(400, 'dayPart must be full, am or pm');
    }
    if (!HOLIDAY_REASONS.includes(reason as HolidayReason)) {
        throw new AppError(400, 'reason is not one we know about');
    }
    const trimmed = typeof note === 'string' ? note.trim() : '';
    if (trimmed.length > MAX_NOTE_LENGTH) {
        throw new AppError(
            400,
            `A note can be at most ${MAX_NOTE_LENGTH} characters`
        );
    }
    return {
        start_date: startDate,
        end_date: end,
        day_part: part as HolidayDayPart,
        reason: reason as HolidayReason,
        note: trimmed || null,
    };
};

/**
 * Whether a holiday takes someone out of a session on a given day and half of
 * the day ('am' before midday, 'pm' after). A half-day holiday only covers the
 * session if it is in that half.
 */
export const coversSession = (
    holiday: Pick<Holiday, 'start_date' | 'end_date' | 'day_part'>,
    day: string,
    part: 'am' | 'pm'
): boolean =>
    holiday.start_date <= day &&
    day <= holiday.end_date &&
    (holiday.day_part === 'full' || holiday.day_part === part);

/**
 * Whether the acting user may add and change this person's holidays: the
 * person themselves, a super admin, or an owner or admin of a team they are in.
 */
export const canManageHolidaysFor = async (
    actor: User,
    target: User
): Promise<boolean> => {
    if (actor.user_id === target.user_id || actor.is_super_admin) return true;
    const managed = await teamRepository.findManagedTeamIds(actor.user_id);
    for (const teamId of managed) {
        if (await teamRepository.findMember(teamId, target.user_id)) {
            return true;
        }
    }
    return false;
};

/** Loads the person whose holidays are being handled, checking the actor may. */
const resolveTarget = async (
    actorSub: string,
    targetUserId?: number
): Promise<{ actor: User; target: User }> => {
    const actor = await getUserBySub(actorSub);
    if (targetUserId === undefined || targetUserId === actor.user_id) {
        return { actor, target: actor };
    }
    const [target] = await userRepository.findUsersByIds([targetUserId]);
    // a 404 for anyone the actor cannot manage, so ids are not probeable
    if (!target || !(await canManageHolidaysFor(actor, target))) {
        throw notFound('User not found');
    }
    return { actor, target };
};

export const getHolidays = async (
    actorSub: string,
    targetUserId?: number,
    from?: string
) => {
    const { target } = await resolveTarget(actorSub, targetUserId);
    return holidayRepository.findHolidaysForUser(target.user_id, from);
};

export const addHoliday = async (
    actorSub: string,
    targetUserId: number | undefined,
    body: unknown
) => {
    const input = parseHoliday(body);
    const { actor, target } = await resolveTarget(actorSub, targetUserId);
    const [created] = await holidayRepository.createHolidays([
        { ...input, user_id: target.user_id, created_by: actor.user_id },
    ]);
    return created;
};

const loadOwnedHoliday = async (
    actorSub: string,
    targetUserId: number | undefined,
    holidayId: number
) => {
    const { target } = await resolveTarget(actorSub, targetUserId);
    const holiday = await holidayRepository.findHoliday(holidayId);
    if (!holiday || holiday.user_id !== target.user_id) {
        throw notFound('Holiday not found');
    }
    return holiday;
};

export const updateHoliday = async (
    actorSub: string,
    targetUserId: number | undefined,
    holidayId: number,
    body: unknown
) => {
    const input = parseHoliday(body);
    const holiday = await loadOwnedHoliday(actorSub, targetUserId, holidayId);
    await holidayRepository.updateHoliday(holiday.holiday_id, input);
    return { ...holiday, ...input };
};

export const deleteHoliday = async (
    actorSub: string,
    targetUserId: number | undefined,
    holidayId: number
) => {
    const holiday = await loadOwnedHoliday(actorSub, targetUserId, holidayId);
    await holidayRepository.deleteHoliday(holiday.holiday_id);
};

type BankHolidayEvent = { title: string; date: string };

const getJson = async <T>(url: string): Promise<T> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} answered ${response.status}`);
        return (await response.json()) as T;
    } catch (error) {
        console.error('Error fetching bank holidays:', error);
        throw new AppError(502, 'Could not fetch bank holidays right now');
    }
};

/** The year the import starts from and the one after, as the yearly APIs need */
const yearsFrom = (now: Date) => [
    now.getUTCFullYear(),
    now.getUTCFullYear() + 1,
];

/**
 * Fetches a region's bank holidays: gov.uk for the UK, Nager.Date for Spain
 * (national ones, plus the chosen community's) and Calendarific for India.
 */
export const fetchBankHolidays = async (
    region: BankHolidayRegion,
    subdivision?: string,
    now = new Date()
): Promise<BankHolidayEvent[]> => {
    const config = REGION_SOURCES[region];
    if (config.source === 'gov.uk') {
        const feed =
            await getJson<Record<string, { events: BankHolidayEvent[] }>>(
                BANK_HOLIDAY_URL
            );
        return feed[region]?.events ?? [];
    }
    if (config.source === 'nager') {
        const years = await Promise.all(
            yearsFrom(now).map((year) =>
                getJson<
                    {
                        date: string;
                        name: string;
                        global: boolean;
                        counties: string[] | null;
                        types: string[];
                    }[]
                >(`${NAGER_URL}/${year}/${config.country}`)
            )
        );
        return years
            .flat()
            .filter(
                (h) =>
                    h.types.includes('Public') &&
                    (h.global ||
                        (!!subdivision && !!h.counties?.includes(subdivision)))
            )
            .map((h) => ({ title: h.name, date: h.date }));
    }
    if (!env.calendarificApiKey) {
        throw new AppError(
            501,
            'India bank holidays are not set up on this server yet'
        );
    }
    const years = await Promise.all(
        yearsFrom(now).map((year) =>
            getJson<{
                response: {
                    holidays: {
                        name: string;
                        date: { iso: string };
                        type: string[];
                    }[];
                };
            }>(
                `${CALENDARIFIC_URL}?api_key=${encodeURIComponent(env.calendarificApiKey!)}&country=${config.country}&year=${year}&type=national`
            )
        )
    );
    return years
        .flatMap((y) => y.response.holidays)
        .filter((h) => h.type.includes('National holiday'))
        .map((h) => ({ title: h.name, date: h.date.iso.slice(0, 10) }));
};

/**
 * Adds the bank holidays for a region, from the start of this year on, as
 * full-day holidays. Ones already added (same day) are skipped, so it can be
 * run again to pick up new years.
 */
export const importBankHolidays = async (
    actorSub: string,
    targetUserId: number | undefined,
    region: unknown,
    subdivision?: unknown,
    now = new Date()
) => {
    if (!BANK_HOLIDAY_REGIONS.includes(region as BankHolidayRegion)) {
        throw new AppError(
            400,
            `region must be one of ${BANK_HOLIDAY_REGIONS.join(', ')}`
        );
    }
    if (
        subdivision !== undefined &&
        subdivision !== null &&
        subdivision !== ''
    ) {
        if (
            region !== 'spain' ||
            !SPAIN_SUBDIVISIONS.includes(subdivision as string)
        ) {
            throw new AppError(400, 'That community is not one we know about');
        }
    }
    const { actor, target } = await resolveTarget(actorSub, targetUserId);
    const yearStart = `${now.getUTCFullYear()}-01-01`;
    const [events, existing] = await Promise.all([
        fetchBankHolidays(
            region as BankHolidayRegion,
            typeof subdivision === 'string' ? subdivision : undefined,
            now
        ),
        holidayRepository.findHolidaysForUser(target.user_id, yearStart),
    ]);
    const have = new Set(
        existing
            .filter((h) => h.reason === 'bank_holiday')
            .map((h) => h.start_date)
    );
    const fresh = events.filter((e) => {
        if (!isDay(e.date) || e.date < yearStart || have.has(e.date)) {
            return false;
        }
        // two holidays on one day (a national and a local one) count once
        have.add(e.date);
        return true;
    });
    const created = await holidayRepository.createHolidays(
        fresh.map((e) => ({
            user_id: target.user_id,
            start_date: e.date,
            end_date: e.date,
            day_part: 'full' as const,
            reason: 'bank_holiday' as const,
            note: e.title,
            created_by: actor.user_id,
        }))
    );
    return { added: created.length };
};

/**
 * Who in a team is away for a session on a given day and half of the day, so
 * they can be left out of a new room by default.
 */
export const getTeamAbsences = async (
    teamId: number,
    userSub: string,
    day: unknown,
    part: unknown
) => {
    if (!isDay(day)) {
        throw new AppError(400, 'date must be a date like 2026-12-24');
    }
    if (part !== 'am' && part !== 'pm') {
        throw new AppError(400, 'part must be am or pm');
    }
    await getAccess(teamId, userSub);
    const members = await teamRepository.findMembers(teamId);
    const holidays = await holidayRepository.findHolidaysOnDay(
        members.map((m) => m.user.user_id),
        day
    );
    const subs = new Map(
        members.map((m) => [m.user.user_id, m.user.auth0_sub])
    );
    return holidays
        .filter((h) => coversSession(h, day, part))
        .map((h) => ({
            userId: h.user_id,
            sub: subs.get(h.user_id)!,
            reason: h.reason,
            dayPart: h.day_part,
            startDate: h.start_date,
            endDate: h.end_date,
        }));
};

const DEFAULT_LEAVE_DAYS = 28;
const MAX_LEAVE_DAYS = 92;

const addDays = (day: string, days: number) =>
    new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
        .toISOString()
        .slice(0, 10);

/**
 * Who in a team has leave in a window of days (default: the next four
 * weeks from today), soonest first, for the team page's "who's away".
 */
export const getTeamLeave = async (
    teamId: number,
    userSub: string,
    from?: unknown,
    to?: unknown,
    now = new Date()
) => {
    const start = from === undefined ? now.toISOString().slice(0, 10) : from;
    if (!isDay(start)) {
        throw new AppError(400, 'from must be a date like 2026-12-24');
    }
    const end = to === undefined ? addDays(start, DEFAULT_LEAVE_DAYS) : to;
    if (!isDay(end) || end < start) {
        throw new AppError(400, 'to must be a date on or after from');
    }
    if (dayNumber(end) - dayNumber(start) > MAX_LEAVE_DAYS) {
        throw new AppError(
            400,
            `Ask for at most ${MAX_LEAVE_DAYS} days at a time`
        );
    }
    await getAccess(teamId, userSub);
    const members = await teamRepository.findMembers(teamId);
    const holidays = await holidayRepository.findHolidaysInRange(
        members.map((m) => m.user.user_id),
        start,
        end
    );
    const subs = new Map(
        members.map((m) => [m.user.user_id, m.user.auth0_sub])
    );
    return holidays.map((h) => ({
        ...toHolidayDto(h),
        sub: subs.get(h.user_id)!,
    }));
};

/** The API's own shape for a holiday: camelCase, with no internal columns. */
export const toHolidayDto = (h: Holiday) => ({
    holidayId: h.holiday_id,
    userId: h.user_id,
    startDate: h.start_date,
    endDate: h.end_date,
    dayPart: h.day_part,
    reason: h.reason,
    note: h.note,
});
