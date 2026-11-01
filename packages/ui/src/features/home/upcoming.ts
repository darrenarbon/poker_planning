import { RoomSummary } from '../../types';
import { dayLabel } from '../../utils';

/** A session still counts as upcoming for this long after it starts, so a running one stays listed */
export const GRACE_MS = 2 * 60 * 60 * 1000;

/** Visible rooms planned for now or later, soonest first */
export const upcomingSessions = (
    rooms: RoomSummary[],
    now = new Date()
): RoomSummary[] =>
    rooms
        .filter((room) => {
            if (room.hidden || !room.scheduled_at) return false;
            const start = new Date(room.scheduled_at).getTime();
            return !Number.isNaN(start) && start >= now.getTime() - GRACE_MS;
        })
        .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!));

/** Whether a session has started and is still within its grace period */
export const isHappeningNow = (room: RoomSummary, now = new Date()) =>
    !!room.scheduled_at &&
    new Date(room.scheduled_at).getTime() <= now.getTime();

/** Sessions under their day heading, in order */
export const groupByDay = (
    rooms: RoomSummary[],
    now = new Date()
): [label: string, rooms: RoomSummary[]][] => {
    const groups = new Map<string, RoomSummary[]>();
    for (const room of rooms) {
        const label = dayLabel(room.scheduled_at!, now);
        groups.set(label, [...(groups.get(label) ?? []), room]);
    }
    return [...groups];
};
