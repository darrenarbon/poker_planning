import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as holidayRepository from '../repositories/holidayRepository.js';
import * as teamRepository from '../repositories/teamRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { makeTeam, makeTeamMember, makeUser } from '../test/factories.js';
import type { Holiday } from '../types/models.js';
import {
    addHoliday,
    coversSession,
    deleteHoliday,
    getTeamAbsences,
    getTeamLeave,
    importBankHolidays,
    parseHoliday,
    updateHoliday,
} from './holidayService.js';

vi.mock('../config/env.js', async (importActual) => {
    const actual = await importActual<typeof import('../config/env.js')>();
    return { env: { ...actual.env, calendarificApiKey: 'key' } };
});
vi.mock('../repositories/holidayRepository.js');
vi.mock('../repositories/teamRepository.js');
vi.mock('../repositories/userRepository.js');

const me = makeUser({ user_id: 1, auth0_sub: 'auth0|me' });
const colleague = makeUser({ user_id: 2, auth0_sub: 'auth0|colleague' });
const stranger = makeUser({ user_id: 3, auth0_sub: 'auth0|stranger' });
const superAdmin = makeUser({
    user_id: 9,
    auth0_sub: 'auth0|super',
    is_super_admin: true,
});

const body = {
    startDate: '2026-12-24',
    endDate: '2026-12-31',
    dayPart: 'full',
    reason: 'annual_leave',
    note: ' Skiing ',
};

const holiday = (overrides: Partial<Holiday> = {}): Holiday => ({
    holiday_id: 5,
    user_id: 2,
    start_date: '2026-12-24',
    end_date: '2026-12-31',
    day_part: 'full',
    reason: 'annual_leave',
    note: null,
    created_by: 2,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
});

beforeEach(() => {
    const users = [me, colleague, stranger, superAdmin];
    vi.mocked(userRepository.findUserBySub).mockImplementation(async (sub) =>
        users.find((u) => u.auth0_sub === sub)
    );
    vi.mocked(userRepository.findUsersByIds).mockImplementation(async (ids) =>
        users.filter((u) => ids.includes(u.user_id))
    );
    // I own team 50, which only the colleague is in besides me
    vi.mocked(teamRepository.findManagedTeamIds).mockImplementation(
        async (userId) => (userId === me.user_id ? [50] : [])
    );
    vi.mocked(teamRepository.findMember).mockImplementation(
        async (teamId, userId) =>
            teamId === 50 && [me.user_id, colleague.user_id].includes(userId)
                ? makeTeamMember({ team_id: 50, user_id: userId })
                : undefined
    );
    vi.mocked(holidayRepository.createHolidays).mockImplementation(
        async (rows) =>
            rows.map((r, i) => ({
                ...r,
                holiday_id: i + 1,
                created_at: '2026-01-01T00:00:00Z',
            }))
    );
});

afterEach(() => vi.unstubAllGlobals());

describe('parseHoliday', () => {
    it('keeps the fields, trims the note and defaults to a single full day', () => {
        expect(parseHoliday(body)).toEqual({
            start_date: '2026-12-24',
            end_date: '2026-12-31',
            day_part: 'full',
            reason: 'annual_leave',
            note: 'Skiing',
        });
        expect(
            parseHoliday({ startDate: '2026-12-24', reason: 'sickness' })
        ).toMatchObject({
            end_date: '2026-12-24',
            day_part: 'full',
            note: null,
        });
    });

    it.each([
        [{ ...body, startDate: '2026-02-31' }],
        [{ ...body, startDate: 'tomorrow' }],
        [{ ...body, endDate: '2026-12-01' }],
        [{ ...body, endDate: '2028-12-31' }],
        [{ ...body, dayPart: 'evening' }],
        [{ ...body, reason: 'fun' }],
        [{ ...body, note: 'x'.repeat(201) }],
    ])('rejects %o with 400', (input) => {
        expect(() => parseHoliday(input)).toThrowError(
            expect.objectContaining({ status: 400 })
        );
    });
});

describe('coversSession', () => {
    const range = { start_date: '2026-12-24', end_date: '2026-12-31' };

    it('covers days inside the range, whatever the half', () => {
        const full = { ...range, day_part: 'full' as const };
        expect(coversSession(full, '2026-12-24', 'am')).toBe(true);
        expect(coversSession(full, '2026-12-31', 'pm')).toBe(true);
        expect(coversSession(full, '2026-12-23', 'am')).toBe(false);
        expect(coversSession(full, '2027-01-01', 'am')).toBe(false);
    });

    it('only covers the matching half for half days', () => {
        const morning = { ...range, day_part: 'am' as const };
        expect(coversSession(morning, '2026-12-25', 'am')).toBe(true);
        expect(coversSession(morning, '2026-12-25', 'pm')).toBe(false);
    });
});

describe('who may manage holidays', () => {
    it('lets people add their own', async () => {
        await addHoliday(me.auth0_sub, undefined, body);
        expect(holidayRepository.createHolidays).toHaveBeenCalledWith([
            expect.objectContaining({ user_id: 1, created_by: 1 }),
        ]);
    });

    it('lets a team owner add for a team member, recording who did it', async () => {
        await addHoliday(me.auth0_sub, colleague.user_id, body);
        expect(holidayRepository.createHolidays).toHaveBeenCalledWith([
            expect.objectContaining({ user_id: 2, created_by: 1 }),
        ]);
    });

    it('lets a super admin add for anyone', async () => {
        await addHoliday(superAdmin.auth0_sub, stranger.user_id, body);
        expect(holidayRepository.createHolidays).toHaveBeenCalledWith([
            expect.objectContaining({ user_id: 3, created_by: 9 }),
        ]);
    });

    it('answers 404 when a team owner targets someone outside their teams', async () => {
        await expect(
            addHoliday(me.auth0_sub, stranger.user_id, body)
        ).rejects.toMatchObject({ status: 404 });
        expect(holidayRepository.createHolidays).not.toHaveBeenCalled();
    });

    it('does not let a plain member act for someone else', async () => {
        await expect(
            addHoliday(colleague.auth0_sub, me.user_id, body)
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe('updateHoliday and deleteHoliday', () => {
    it('updates the holiday of the person being acted for', async () => {
        vi.mocked(holidayRepository.findHoliday).mockResolvedValue(holiday());
        const updated = await updateHoliday(me.auth0_sub, 2, 5, body);
        expect(holidayRepository.updateHoliday).toHaveBeenCalledWith(
            5,
            expect.objectContaining({ reason: 'annual_leave', note: 'Skiing' })
        );
        expect(updated.note).toBe('Skiing');
    });

    it("404s on someone else's holiday id", async () => {
        vi.mocked(holidayRepository.findHoliday).mockResolvedValue(
            holiday({ user_id: 3 })
        );
        await expect(
            deleteHoliday(me.auth0_sub, undefined, 5)
        ).rejects.toMatchObject({ status: 404 });
        await expect(
            updateHoliday(me.auth0_sub, undefined, 5, body)
        ).rejects.toMatchObject({ status: 404 });
        expect(holidayRepository.deleteHoliday).not.toHaveBeenCalled();
    });

    it('deletes your own holiday', async () => {
        vi.mocked(holidayRepository.findHoliday).mockResolvedValue(
            holiday({ user_id: 1 })
        );
        await deleteHoliday(me.auth0_sub, undefined, 5);
        expect(holidayRepository.deleteHoliday).toHaveBeenCalledWith(5);
    });
});

describe('importBankHolidays', () => {
    const feed = {
        'england-and-wales': {
            events: [
                { title: 'Old', date: '2025-12-25' },
                { title: 'Boxing Day', date: '2026-12-28' },
                { title: 'New Year', date: '2027-01-01' },
            ],
        },
        scotland: { events: [{ title: '2nd January', date: '2027-01-04' }] },
    };

    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({ ok: true, json: async () => feed }))
        );
        vi.mocked(holidayRepository.findHolidaysForUser).mockResolvedValue([
            holiday({
                user_id: 1,
                start_date: '2027-01-01',
                end_date: '2027-01-01',
                reason: 'bank_holiday',
            }),
        ]);
    });

    it('adds this year onwards for the region, skipping days already added', async () => {
        const result = await importBankHolidays(
            me.auth0_sub,
            undefined,
            'england-and-wales',
            undefined,
            new Date('2026-06-01T00:00:00Z')
        );
        expect(result).toEqual({ added: 1 });
        expect(holidayRepository.createHolidays).toHaveBeenCalledWith([
            expect.objectContaining({
                user_id: 1,
                start_date: '2026-12-28',
                reason: 'bank_holiday',
                note: 'Boxing Day',
            }),
        ]);
    });

    it("adds Spain's national holidays plus the chosen community's", async () => {
        const nager = (year: number) => [
            {
                date: `${year}-12-25`,
                name: 'Christmas',
                global: true,
                counties: null,
                types: ['Public'],
            },
            {
                date: `${year}-12-26`,
                name: 'Sant Esteve',
                global: false,
                counties: ['ES-CT'],
                types: ['Public'],
            },
            {
                date: `${year}-12-27`,
                name: 'Elsewhere',
                global: false,
                counties: ['ES-AN'],
                types: ['Public'],
            },
        ];
        const fetchMock = vi.fn(async (url: string) => ({
            ok: true,
            json: async () => nager(Number(url.split('/').at(-2))),
        }));
        vi.stubGlobal('fetch', fetchMock);
        vi.mocked(holidayRepository.findHolidaysForUser).mockResolvedValue([]);

        const result = await importBankHolidays(
            me.auth0_sub,
            undefined,
            'spain',
            'ES-CT',
            new Date('2026-06-01T00:00:00Z')
        );
        expect(result).toEqual({ added: 4 });
        const notes = vi
            .mocked(holidayRepository.createHolidays)
            .mock.calls[0][0].map((h) => h.note);
        expect(notes).toEqual([
            'Christmas',
            'Sant Esteve',
            'Christmas',
            'Sant Esteve',
        ]);
    });

    it("adds India's national holidays from Calendarific", async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: true,
                json: async () => ({
                    response: {
                        holidays: [
                            {
                                name: 'Republic Day',
                                date: { iso: '2027-01-26' },
                                type: ['National holiday'],
                            },
                            {
                                name: 'Holi',
                                date: { iso: '2027-03-22' },
                                type: ['Observance'],
                            },
                        ],
                    },
                }),
            }))
        );
        vi.mocked(holidayRepository.findHolidaysForUser).mockResolvedValue([]);
        await importBankHolidays(
            me.auth0_sub,
            undefined,
            'india',
            undefined,
            new Date('2026-06-01T00:00:00Z')
        );
        const rows = vi.mocked(holidayRepository.createHolidays).mock
            .calls[0][0];
        expect(rows.map((h) => h.note)).toEqual(['Republic Day']);
    });

    it('rejects a community outside Spain with 400', async () => {
        await expect(
            importBankHolidays(me.auth0_sub, undefined, 'scotland', 'ES-CT')
        ).rejects.toMatchObject({ status: 400 });
    });

    it('rejects an unknown region with 400', async () => {
        await expect(
            importBankHolidays(me.auth0_sub, undefined, 'narnia')
        ).rejects.toMatchObject({ status: 400 });
    });

    it('answers 502 when gov.uk cannot be reached', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('offline');
            })
        );
        await expect(
            importBankHolidays(me.auth0_sub, undefined, 'scotland')
        ).rejects.toMatchObject({ status: 502 });
    });
});

describe('getTeamAbsences', () => {
    beforeEach(() => {
        vi.mocked(teamRepository.findTeamById).mockResolvedValue(makeTeam());
        vi.mocked(teamRepository.findMembers).mockResolvedValue([
            { role: 'owner', joined_at: '', user: me },
            { role: 'member', joined_at: '', user: colleague },
        ]);
    });

    it('lists members away at that time, ignoring the other half of a half day', async () => {
        vi.mocked(holidayRepository.findHolidaysOnDay).mockResolvedValue([
            holiday({ user_id: 2, day_part: 'am' }),
        ]);
        await expect(
            getTeamAbsences(50, me.auth0_sub, '2026-12-25', 'am')
        ).resolves.toEqual([
            expect.objectContaining({ sub: 'auth0|colleague', dayPart: 'am' }),
        ]);
        await expect(
            getTeamAbsences(50, me.auth0_sub, '2026-12-25', 'pm')
        ).resolves.toEqual([]);
    });

    it('is only for people in the team, and needs a valid time', async () => {
        await expect(
            getTeamAbsences(50, stranger.auth0_sub, '2026-12-25', 'am')
        ).rejects.toMatchObject({ status: 404 });
        await expect(
            getTeamAbsences(50, me.auth0_sub, 'soon', 'am')
        ).rejects.toMatchObject({ status: 400 });
        await expect(
            getTeamAbsences(50, me.auth0_sub, '2026-12-25', 'noon')
        ).rejects.toMatchObject({ status: 400 });
    });
});

describe('getTeamLeave', () => {
    beforeEach(() => {
        vi.mocked(teamRepository.findTeamById).mockResolvedValue(makeTeam());
        vi.mocked(teamRepository.findMembers).mockResolvedValue([
            { role: 'owner', joined_at: '', user: me },
            { role: 'member', joined_at: '', user: colleague },
        ]);
        vi.mocked(holidayRepository.findHolidaysInRange).mockResolvedValue([
            holiday({ user_id: 2 }),
        ]);
    });

    it('defaults to the next four weeks and names who is away', async () => {
        const leave = await getTeamLeave(
            50,
            me.auth0_sub,
            undefined,
            undefined,
            new Date('2026-12-01T10:00:00Z')
        );
        expect(holidayRepository.findHolidaysInRange).toHaveBeenCalledWith(
            [1, 2],
            '2026-12-01',
            '2026-12-29'
        );
        expect(leave).toEqual([
            expect.objectContaining({ sub: 'auth0|colleague', userId: 2 }),
        ]);
    });

    it('is for team members only and rejects bad or huge windows', async () => {
        await expect(
            getTeamLeave(50, stranger.auth0_sub)
        ).rejects.toMatchObject({ status: 404 });
        await expect(
            getTeamLeave(50, me.auth0_sub, 'soon')
        ).rejects.toMatchObject({ status: 400 });
        await expect(
            getTeamLeave(50, me.auth0_sub, '2026-01-01', '2026-12-31')
        ).rejects.toMatchObject({ status: 400 });
    });
});
