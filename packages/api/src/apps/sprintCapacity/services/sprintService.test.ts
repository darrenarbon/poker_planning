import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as holidayRepository from '../../../repositories/holidayRepository.js';
import * as teamRepository from '../../../repositories/teamRepository.js';
import * as userRepository from '../../../repositories/userRepository.js';
import { makeTeam, makeTeamMember, makeUser } from '../../../test/factories.js';
import type { Sprint } from '../../../types/models.js';
import * as sprintRepository from '../repositories/sprintRepository.js';
import {
    closeSprint,
    createSprint,
    getForecast,
    getSprint,
    getSprints,
    parseSprint,
    startSprint,
    updateSprint,
} from './sprintService.js';

vi.mock('../../../repositories/holidayRepository.js');
vi.mock('../../../repositories/teamRepository.js');
vi.mock('../../../repositories/userRepository.js');
vi.mock('../repositories/sprintRepository.js');

const team = makeTeam();
const owner = makeUser({ user_id: 1, auth0_sub: 'auth0|owner' });
const dev = makeUser({ user_id: 2, auth0_sub: 'auth0|dev' });
const outsider = makeUser({ user_id: 4, auth0_sub: 'auth0|outsider' });

const roles: Record<number, 'owner' | 'member'> = {
    [owner.user_id]: 'owner',
    [dev.user_id]: 'member',
};

// Mon 2 Nov to Fri 13 Nov 2026: ten working days
const body = {
    name: 'Sprint 12',
    startDate: '2026-11-02',
    endDate: '2026-11-13',
    bufferPercent: 10,
    carriedOverPoints: 8,
    carriedOverTickets: 3,
    memberIds: [1, 2],
};

const sprint = (overrides: Partial<Sprint> = {}): Sprint => ({
    sprint_id: 10,
    team_id: team.team_id,
    name: 'Sprint 1',
    start_date: '2026-01-05',
    end_date: '2026-01-16',
    status: 'closed',
    buffer_percent: 0,
    carried_over_points: 0,
    carried_over_tickets: 0,
    planned_points: 25,
    completed_points: 20,
    available_person_days: 40,
    created_by: 1,
    created_at: '2026-01-01T00:00:00Z',
    closed_at: '2026-01-17T00:00:00Z',
    ...overrides,
});

const history = [
    sprint({ sprint_id: 1, end_date: '2026-01-16' }),
    sprint({ sprint_id: 2, end_date: '2026-01-30', completed_points: 20 }),
    sprint({ sprint_id: 3, end_date: '2026-02-13', completed_points: 20 }),
];

beforeEach(() => {
    vi.resetAllMocks();
    const users = [owner, dev, outsider];
    vi.mocked(userRepository.findUserBySub).mockImplementation(async (sub) =>
        users.find((u) => u.auth0_sub === sub)
    );
    vi.mocked(teamRepository.findTeamById).mockResolvedValue(team);
    vi.mocked(teamRepository.findMember).mockImplementation(
        async (teamId, userId) =>
            roles[userId]
                ? makeTeamMember({
                      team_id: teamId,
                      user_id: userId,
                      role: roles[userId],
                  })
                : undefined
    );
    vi.mocked(teamRepository.findMembers).mockResolvedValue([
        {
            role: 'owner',
            joined_at: '',
            job_title: 'lead_developer',
            user: owner,
        },
        { role: 'member', joined_at: '', job_title: 'developer', user: dev },
    ]);
    vi.mocked(holidayRepository.findHolidaysInRange).mockResolvedValue([]);
    vi.mocked(sprintRepository.findSprintsForTeam).mockResolvedValue(history);
    vi.mocked(sprintRepository.findSprintMembers).mockResolvedValue(
        new Map([[10, [1, 2]]])
    );
    vi.mocked(sprintRepository.createSprint).mockImplementation(
        async (s) => sprint({ ...s, sprint_id: 10 }) as Sprint
    );
});

describe('parseSprint', () => {
    it('keeps only the fields a sprint has', () => {
        expect(parseSprint({ ...body, extra: 1 })).toEqual({
            name: 'Sprint 12',
            start_date: '2026-11-02',
            end_date: '2026-11-13',
            buffer_percent: 10,
            carried_over_points: 8,
            carried_over_tickets: 3,
            planned_points: null,
            completed_points: null,
        });
    });

    it.each([
        [{ name: ' ' }, 'name'],
        [{ startDate: '2026-02-31' }, 'startDate'],
        [{ endDate: '2026-10-01' }, 'before'],
        [{ startDate: '2026-11-07', endDate: '2026-11-08' }, 'working day'],
        [{ endDate: '2027-06-01' }, 'at most'],
        [{ bufferPercent: 101 }, 'bufferPercent'],
        [{ carriedOverPoints: -1 }, 'carriedOverPoints'],
        [{ carriedOverTickets: 1.5 }, 'carriedOverTickets'],
        [{ completedPoints: 5 }, 'planned'],
    ])('rejects %j', (change, message) => {
        expect(() => parseSprint({ ...body, ...change })).toThrow(message);
    });
});

describe('createSprint', () => {
    it('plans a sprint and stores its people', async () => {
        const result = await createSprint(team.team_id, owner.auth0_sub, body);
        expect(result).toMatchObject({ status: 'planned', memberIds: [1, 2] });
        expect(sprintRepository.createSprint).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'planned', created_by: 1 })
        );
        expect(sprintRepository.setSprintMembers).toHaveBeenCalledWith(
            10,
            [1, 2]
        );
    });

    it('enters a past sprint closed, fixing the available days', async () => {
        vi.mocked(holidayRepository.findHolidaysInRange).mockResolvedValue([
            {
                holiday_id: 1,
                user_id: 2,
                start_date: '2026-11-03',
                end_date: '2026-11-04',
                day_part: 'full',
                reason: 'annual_leave',
                note: null,
                created_by: 1,
                created_at: '',
            },
        ]);
        await createSprint(team.team_id, owner.auth0_sub, {
            ...body,
            plannedPoints: 30,
            completedPoints: 24,
        });
        // 2 people x 10 days, less 2 days of leave
        expect(sprintRepository.createSprint).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'closed',
                completed_points: 24,
                available_person_days: 18,
            })
        );
    });

    it('is for owners and admins only', async () => {
        await expect(
            createSprint(team.team_id, dev.auth0_sub, body)
        ).rejects.toMatchObject({ status: 403 });
    });

    it('404s for outsiders', async () => {
        await expect(
            createSprint(team.team_id, outsider.auth0_sub, body)
        ).rejects.toMatchObject({ status: 404 });
    });

    it('rejects people who are not in the team', async () => {
        await expect(
            createSprint(team.team_id, owner.auth0_sub, {
                ...body,
                memberIds: [1, 99],
            })
        ).rejects.toMatchObject({ status: 400 });
    });
});

describe('getSprints', () => {
    it('lists sprints with the velocity they add up to', async () => {
        const result = await getSprints(team.team_id, dev.auth0_sub);
        expect(result.canManage).toBe(false);
        expect(result.sprints).toHaveLength(3);
        expect(result.velocity).toMatchObject({
            sprintsUsed: 3,
            perPersonDay: 0.5,
            confidence: 'normal',
        });
    });
});

describe('getForecast', () => {
    it('works out what a sprint could hold and what is left for new work', async () => {
        const result = await getForecast(team.team_id, dev.auth0_sub, {
            startDate: '2026-11-02',
            endDate: '2026-11-13',
            memberIds: '1,2',
            bufferPercent: '10',
            carriedOverPoints: '4',
        });
        // 20 person-days at 0.5 a day = 10, less 10% = 9, less 4 carried over
        expect(result).toMatchObject({
            availablePersonDays: 20,
            capacity: { expected: 9 },
            newPoints: { expected: 5 },
        });
        expect(result.people.map((p) => p.jobTitle)).toEqual([
            'lead_developer',
            'developer',
        ]);
    });
});

describe('getSprint', () => {
    it('forecasts only from sprints that finished before it', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(
            sprint({
                sprint_id: 10,
                status: 'planned',
                start_date: '2026-01-20',
                end_date: '2026-01-30',
                completed_points: null,
                available_person_days: null,
            })
        );
        const result = await getSprint(team.team_id, 10, owner.auth0_sub);
        // only sprint 1 ended before 20 Jan, so not enough history yet
        expect(result.forecast.velocity.confidence).toBe('none');
        expect(result.forecast.newPoints).toBeNull();
    });

    it('404s for a sprint in another team', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(
            sprint({ team_id: 999 })
        );
        await expect(
            getSprint(team.team_id, 10, owner.auth0_sub)
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe('startSprint', () => {
    const planned = sprint({ status: 'planned', completed_points: null });

    it('starts a planned sprint', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(planned);
        await startSprint(team.team_id, 10, owner.auth0_sub);
        expect(sprintRepository.updateSprint).toHaveBeenCalledWith(10, {
            status: 'active',
        });
    });

    it('refuses while another sprint is active', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(planned);
        vi.mocked(sprintRepository.findSprintsForTeam).mockResolvedValue([
            sprint({ sprint_id: 11, status: 'active' }),
        ]);
        await expect(
            startSprint(team.team_id, 10, owner.auth0_sub)
        ).rejects.toMatchObject({ status: 409 });
    });

    it('refuses a sprint that is not planned', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(
            sprint({ status: 'active' })
        );
        await expect(
            startSprint(team.team_id, 10, owner.auth0_sub)
        ).rejects.toMatchObject({ status: 409 });
    });
});

describe('closeSprint', () => {
    const active = sprint({
        status: 'active',
        planned_points: 30,
        completed_points: null,
        available_person_days: null,
        start_date: '2026-11-02',
        end_date: '2026-11-13',
    });

    it('records what was completed and fixes the available days', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(active);
        await closeSprint(team.team_id, 10, owner.auth0_sub, {
            completedPoints: 22,
        });
        expect(sprintRepository.updateSprint).toHaveBeenCalledWith(
            10,
            expect.objectContaining({
                status: 'closed',
                completed_points: 22,
                planned_points: 30,
                available_person_days: 20,
            })
        );
    });

    it('needs completed points', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(active);
        await expect(
            closeSprint(team.team_id, 10, owner.auth0_sub, {})
        ).rejects.toMatchObject({ status: 400 });
    });

    it('cannot close a sprint twice', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(sprint());
        await expect(
            closeSprint(team.team_id, 10, owner.auth0_sub, {
                completedPoints: 1,
            })
        ).rejects.toMatchObject({ status: 409 });
    });
});

describe('updateSprint', () => {
    it('recalculates the available days when a closed sprint is corrected', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(sprint());
        await updateSprint(team.team_id, 10, owner.auth0_sub, {
            ...body,
            plannedPoints: 30,
            completedPoints: 25,
        });
        expect(sprintRepository.updateSprint).toHaveBeenCalledWith(
            10,
            expect.objectContaining({
                completed_points: 25,
                available_person_days: 20,
            })
        );
    });

    it('ignores completed points on a sprint that is still open', async () => {
        vi.mocked(sprintRepository.findSprint).mockResolvedValue(
            sprint({ status: 'planned', completed_points: null })
        );
        await updateSprint(team.team_id, 10, owner.auth0_sub, {
            ...body,
            plannedPoints: 30,
            completedPoints: 25,
        });
        expect(sprintRepository.updateSprint).toHaveBeenCalledWith(
            10,
            expect.objectContaining({ completed_points: null })
        );
    });
});
