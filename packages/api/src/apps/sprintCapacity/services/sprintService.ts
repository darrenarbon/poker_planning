import * as holidayRepository from '../../../repositories/holidayRepository.js';
import * as teamRepository from '../../../repositories/teamRepository.js';
import { getAccess } from '../../../services/teamService.js';
import type { TeamAccess } from '../../../services/teamService.js';
import type { Sprint, SprintInput } from '../../../types/models.js';
import { AppError, notFound } from '../../../utils/errors.js';
import * as sprintRepository from '../repositories/sprintRepository.js';
import {
    daysBetween,
    forecastCapacity,
    isDay,
    personAvailability,
    summariseVelocity,
    workingDays,
} from './capacity.js';
import type { ClosedSprintFigures } from './capacity.js';

const MAX_NAME_LENGTH = 80;
const MAX_SPRINT_DAYS = 92;

/** Whether the sprint is one with figures to learn from */
const isClosed = (sprint: Sprint) =>
    sprint.status === 'closed' &&
    sprint.completed_points !== null &&
    sprint.available_person_days !== null;

const requireManager = async (teamId: number, userSub: string) => {
    const access = await getAccess(teamId, userSub);
    if (!access.isManager) {
        throw new AppError(403, 'Only a team owner or admin can plan sprints');
    }
    return access;
};

const number = (
    value: unknown,
    field: string,
    { max, integer = false }: { max?: number; integer?: boolean } = {}
): number => {
    const n = typeof value === 'string' && value.trim() ? Number(value) : value;
    if (
        typeof n !== 'number' ||
        !Number.isFinite(n) ||
        n < 0 ||
        (max !== undefined && n > max) ||
        (integer && !Number.isInteger(n))
    ) {
        throw new AppError(
            400,
            `${field} must be ${integer ? 'a whole number' : 'a number'}${
                max === undefined ? ' of 0 or more' : ` from 0 to ${max}`
            }`
        );
    }
    return n;
};

const optionalNumber = (value: unknown, field: string) =>
    value === undefined || value === null || value === ''
        ? null
        : number(value, field);

/** Checks the dates of a sprint, returning them. */
const parseDates = (startDate: unknown, endDate: unknown) => {
    if (!isDay(startDate)) {
        throw new AppError(400, 'startDate must be a date like 2026-12-24');
    }
    if (!isDay(endDate)) {
        throw new AppError(400, 'endDate must be a date like 2026-12-24');
    }
    if (endDate < startDate) {
        throw new AppError(400, 'endDate cannot be before startDate');
    }
    if (daysBetween(startDate, endDate) >= MAX_SPRINT_DAYS) {
        throw new AppError(
            400,
            `A sprint can be at most ${MAX_SPRINT_DAYS} days long`
        );
    }
    if (!workingDays(startDate, endDate).length) {
        throw new AppError(400, 'A sprint needs at least one working day');
    }
    return { start_date: startDate, end_date: endDate };
};

/** Checks a request body and keeps only the fields a sprint has. */
export const parseSprint = (body: unknown): SprintInput => {
    const {
        name,
        startDate,
        endDate,
        bufferPercent,
        carriedOverPoints,
        carriedOverTickets,
        plannedPoints,
        completedPoints,
    } = (body ?? {}) as Record<string, unknown>;
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed) throw new AppError(400, 'A sprint needs a name');
    if (trimmed.length > MAX_NAME_LENGTH) {
        throw new AppError(
            400,
            `A sprint name can be at most ${MAX_NAME_LENGTH} characters`
        );
    }
    const planned = optionalNumber(plannedPoints, 'plannedPoints');
    const completed = optionalNumber(completedPoints, 'completedPoints');
    if (completed !== null && planned === null) {
        throw new AppError(
            400,
            'A sprint with completed points also needs the points that were planned'
        );
    }
    return {
        name: trimmed,
        ...parseDates(startDate, endDate),
        buffer_percent: number(bufferPercent ?? 0, 'bufferPercent', {
            max: 100,
        }),
        carried_over_points: number(
            carriedOverPoints ?? 0,
            'carriedOverPoints'
        ),
        carried_over_tickets: number(
            carriedOverTickets ?? 0,
            'carriedOverTickets',
            { integer: true }
        ),
        planned_points: planned,
        completed_points: completed,
    };
};

/** Checks the people picked for a sprint are all in the team. */
const parseMemberIds = async (
    teamId: number,
    memberIds: unknown
): Promise<number[]> => {
    if (
        !Array.isArray(memberIds) ||
        !memberIds.every((id) => Number.isInteger(id) && id > 0)
    ) {
        throw new AppError(400, 'memberIds must be a list of user ids');
    }
    const ids = [...new Set(memberIds as number[])];
    const members = await teamRepository.findMembers(teamId);
    const inTeam = new Set(members.map((m) => m.user.user_id));
    if (ids.some((id) => !inTeam.has(id))) {
        throw new AppError(400, 'Everyone in a sprint must be in the team');
    }
    return ids;
};

/** Everything about a team's closed sprints that velocity is worked out from. */
const closedFigures = (sprints: Sprint[]): ClosedSprintFigures[] =>
    sprints.filter(isClosed).map((s) => ({
        endDate: s.end_date,
        completedPoints: s.completed_points!,
        availablePersonDays: s.available_person_days!,
    }));

interface Availability {
    userId: number;
    sub: string;
    givenName: string;
    familyName: string;
    nickname: string;
    picture: string;
    jobTitle: string | null;
    leaveDays: number;
    availableDays: number;
}

/** Each person's leave and availability across a date range. */
const availabilityFor = async (
    teamId: number,
    userIds: number[],
    start: string,
    end: string
): Promise<{ days: number; people: Availability[] }> => {
    const days = workingDays(start, end);
    const members = (await teamRepository.findMembers(teamId)).filter((m) =>
        userIds.includes(m.user.user_id)
    );
    const holidays = await holidayRepository.findHolidaysInRange(
        userIds,
        start,
        end
    );
    return {
        days: days.length,
        people: members.map((m) => ({
            userId: m.user.user_id,
            sub: m.user.auth0_sub,
            givenName: m.user.given_name,
            familyName: m.user.family_name,
            nickname: m.user.nickname,
            picture: m.user.picture,
            jobTitle: m.job_title,
            ...personAvailability(
                holidays.filter((h) => h.user_id === m.user.user_id),
                days
            ),
        })),
    };
};

const totalDays = (people: Availability[]) =>
    people.reduce((sum, p) => sum + p.availableDays, 0);

/** The forecast for a sprint, planned or just being thought about. */
const buildForecast = async (
    teamId: number,
    history: Sprint[],
    plan: {
        startDate: string;
        endDate: string;
        memberIds: number[];
        bufferPercent: number;
        carriedOverPoints: number;
    }
) => {
    const availability = await availabilityFor(
        teamId,
        plan.memberIds,
        plan.startDate,
        plan.endDate
    );
    const velocity = summariseVelocity(closedFigures(history));
    const personDays = totalDays(availability.people);
    return {
        workingDays: availability.days,
        people: availability.people,
        availablePersonDays: personDays,
        velocity,
        bufferPercent: plan.bufferPercent,
        carriedOverPoints: plan.carriedOverPoints,
        ...forecastCapacity(
            velocity,
            personDays,
            plan.bufferPercent,
            plan.carriedOverPoints
        ),
    };
};

export const toSprintDto = (sprint: Sprint, memberIds: number[]) => ({
    sprintId: sprint.sprint_id,
    teamId: sprint.team_id,
    name: sprint.name,
    startDate: sprint.start_date,
    endDate: sprint.end_date,
    status: sprint.status,
    bufferPercent: sprint.buffer_percent,
    carriedOverPoints: sprint.carried_over_points,
    carriedOverTickets: sprint.carried_over_tickets,
    plannedPoints: sprint.planned_points,
    completedPoints: sprint.completed_points,
    availablePersonDays: sprint.available_person_days,
    velocityPerPersonDay:
        isClosed(sprint) && sprint.available_person_days! > 0
            ? Math.round(
                  (sprint.completed_points! / sprint.available_person_days!) *
                      1000
              ) / 1000
            : null,
    closedAt: sprint.closed_at,
    memberIds,
});

const loadSprint = async (
    teamId: number,
    sprintId: number
): Promise<Sprint> => {
    const sprint = await sprintRepository.findSprint(sprintId);
    if (!sprint || sprint.team_id !== teamId) {
        throw notFound('Sprint not found');
    }
    return sprint;
};

/** A team's sprints, newest first, with the velocity they add up to. */
export const getSprints = async (teamId: number, userSub: string) => {
    const access: TeamAccess = await getAccess(teamId, userSub);
    const sprints = await sprintRepository.findSprintsForTeam(teamId);
    const members = await sprintRepository.findSprintMembers(
        sprints.map((s) => s.sprint_id)
    );
    return {
        canManage: access.isManager,
        velocity: summariseVelocity(closedFigures(sprints)),
        sprints: sprints.map((s) =>
            toSprintDto(s, members.get(s.sprint_id) ?? [])
        ),
    };
};

/** What a sprint with these dates and people could hold, before it is saved. */
export const getForecast = async (
    teamId: number,
    userSub: string,
    query: Record<string, unknown>
) => {
    await getAccess(teamId, userSub);
    const dates = parseDates(query.startDate, query.endDate);
    const memberIds = String(query.memberIds ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number);
    const ids = await parseMemberIds(teamId, memberIds);
    const history = await sprintRepository.findSprintsForTeam(teamId);
    return buildForecast(teamId, history, {
        startDate: dates.start_date,
        endDate: dates.end_date,
        memberIds: ids,
        bufferPercent: number(query.bufferPercent ?? 0, 'bufferPercent', {
            max: 100,
        }),
        carriedOverPoints: number(
            query.carriedOverPoints ?? 0,
            'carriedOverPoints'
        ),
    });
};

/** One sprint, with its people's leave and what it could hold. */
export const getSprint = async (
    teamId: number,
    sprintId: number,
    userSub: string
) => {
    const access = await getAccess(teamId, userSub);
    const sprint = await loadSprint(teamId, sprintId);
    const memberIds =
        (await sprintRepository.findSprintMembers([sprintId])).get(sprintId) ??
        [];
    // a sprint is forecast from the sprints that finished before it
    const history = (await sprintRepository.findSprintsForTeam(teamId)).filter(
        (s) => s.sprint_id !== sprintId && s.end_date < sprint.start_date
    );
    return {
        canManage: access.isManager,
        sprint: toSprintDto(sprint, memberIds),
        forecast: await buildForecast(teamId, history, {
            startDate: sprint.start_date,
            endDate: sprint.end_date,
            memberIds,
            bufferPercent: sprint.buffer_percent,
            carriedOverPoints: sprint.carried_over_points,
        }),
    };
};

/** Works out and stores a closed sprint's available person-days. */
const closedFields = async (
    teamId: number,
    input: Pick<SprintInput, 'start_date' | 'end_date'>,
    memberIds: number[]
) => ({
    available_person_days: totalDays(
        (
            await availabilityFor(
                teamId,
                memberIds,
                input.start_date,
                input.end_date
            )
        ).people
    ),
});

/**
 * Adds a sprint. With completed points it is a sprint from the past being
 * entered into the history, so it is created closed; otherwise it is planned.
 */
export const createSprint = async (
    teamId: number,
    userSub: string,
    body: unknown
) => {
    const access = await requireManager(teamId, userSub);
    const input = parseSprint(body);
    const memberIds = await parseMemberIds(
        teamId,
        (body as { memberIds?: unknown })?.memberIds
    );
    const backfill = input.completed_points !== null;
    const sprint = await sprintRepository.createSprint({
        ...input,
        team_id: teamId,
        status: backfill ? 'closed' : 'planned',
        created_by: access.user.user_id,
        ...(backfill
            ? {
                  ...(await closedFields(teamId, input, memberIds)),
                  closed_at: new Date().toISOString(),
              }
            : {}),
    });
    await sprintRepository.setSprintMembers(sprint.sprint_id, memberIds);
    return toSprintDto(sprint, memberIds);
};

export const updateSprint = async (
    teamId: number,
    sprintId: number,
    userSub: string,
    body: unknown
) => {
    await requireManager(teamId, userSub);
    const existing = await loadSprint(teamId, sprintId);
    const input = parseSprint(body);
    const memberIds = await parseMemberIds(
        teamId,
        (body as { memberIds?: unknown })?.memberIds
    );
    if (existing.status === 'closed' && input.completed_points === null) {
        throw new AppError(400, 'A closed sprint needs its completed points');
    }
    if (existing.status !== 'closed') {
        // completed points are only recorded by closing the sprint
        input.completed_points = null;
    }
    await sprintRepository.updateSprint(sprintId, {
        ...input,
        ...(existing.status === 'closed'
            ? await closedFields(teamId, input, memberIds)
            : {}),
    });
    await sprintRepository.setSprintMembers(sprintId, memberIds);
    return getSprint(teamId, sprintId, userSub);
};

export const deleteSprint = async (
    teamId: number,
    sprintId: number,
    userSub: string
) => {
    await requireManager(teamId, userSub);
    await loadSprint(teamId, sprintId);
    await sprintRepository.deleteSprint(sprintId);
};

/** Starts a planned sprint. A team can only have one active at a time. */
export const startSprint = async (
    teamId: number,
    sprintId: number,
    userSub: string
) => {
    await requireManager(teamId, userSub);
    const sprint = await loadSprint(teamId, sprintId);
    if (sprint.status !== 'planned') {
        throw new AppError(409, 'Only a planned sprint can be started');
    }
    const sprints = await sprintRepository.findSprintsForTeam(teamId);
    if (sprints.some((s) => s.status === 'active')) {
        throw new AppError(
            409,
            'Close the current sprint before starting another'
        );
    }
    await sprintRepository.updateSprint(sprintId, { status: 'active' });
    return getSprint(teamId, sprintId, userSub);
};

/**
 * Closes a sprint with what was actually completed. The team's available
 * person-days are fixed here, so velocity is not changed by later leave edits.
 */
export const closeSprint = async (
    teamId: number,
    sprintId: number,
    userSub: string,
    body: unknown
) => {
    await requireManager(teamId, userSub);
    const sprint = await loadSprint(teamId, sprintId);
    if (sprint.status === 'closed') {
        throw new AppError(409, 'That sprint is already closed');
    }
    const { completedPoints, plannedPoints } = (body ?? {}) as Record<
        string,
        unknown
    >;
    const completed = number(completedPoints, 'completedPoints');
    const planned =
        plannedPoints === undefined || plannedPoints === null
            ? sprint.planned_points
            : number(plannedPoints, 'plannedPoints');
    if (planned === null) {
        throw new AppError(400, 'plannedPoints is needed to close the sprint');
    }
    const memberIds =
        (await sprintRepository.findSprintMembers([sprintId])).get(sprintId) ??
        [];
    await sprintRepository.updateSprint(sprintId, {
        status: 'closed',
        completed_points: completed,
        planned_points: planned,
        closed_at: new Date().toISOString(),
        ...(await closedFields(
            teamId,
            { start_date: sprint.start_date, end_date: sprint.end_date },
            memberIds
        )),
    });
    return getSprint(teamId, sprintId, userSub);
};
