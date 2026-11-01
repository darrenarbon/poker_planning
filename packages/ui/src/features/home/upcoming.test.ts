import { describe, expect, it } from 'vitest';
import { makeRoomSummary } from '../../test/factories';
import { groupByDay, isHappeningNow, upcomingSessions } from './upcoming';

const now = new Date(2030, 4, 1, 12, 0);
const at = (days: number, hour: number, minute = 0) =>
    new Date(2030, 4, 1 + days, hour, minute).toISOString();

describe('upcomingSessions', () => {
    it('keeps rooms planned for later, soonest first', () => {
        const rooms = [
            makeRoomSummary({ room_id: 1, scheduled_at: at(2, 9) }),
            makeRoomSummary({ room_id: 2, scheduled_at: at(0, 15) }),
            makeRoomSummary({ room_id: 3, scheduled_at: at(1, 9) }),
        ];
        expect(upcomingSessions(rooms, now).map((r) => r.room_id)).toEqual([
            2, 3, 1,
        ]);
    });

    it('drops past, hidden and undated rooms', () => {
        const rooms = [
            makeRoomSummary({ room_id: 1, scheduled_at: at(-1, 9) }),
            makeRoomSummary({
                room_id: 2,
                scheduled_at: at(1, 9),
                hidden: true,
            }),
            makeRoomSummary({ room_id: 3 }),
            makeRoomSummary({ room_id: 4, scheduled_at: 'nonsense' }),
            makeRoomSummary({ room_id: 5, scheduled_at: at(1, 9) }),
        ];
        expect(upcomingSessions(rooms, now).map((r) => r.room_id)).toEqual([5]);
    });

    it('keeps a session that started within the last two hours', () => {
        const rooms = [
            makeRoomSummary({ room_id: 1, scheduled_at: at(0, 10, 30) }),
            makeRoomSummary({ room_id: 2, scheduled_at: at(0, 9, 30) }),
        ];
        expect(upcomingSessions(rooms, now).map((r) => r.room_id)).toEqual([1]);
    });
});

describe('isHappeningNow', () => {
    it('is true once the start time has passed', () => {
        expect(
            isHappeningNow(makeRoomSummary({ scheduled_at: at(0, 11) }), now)
        ).toBe(true);
        expect(
            isHappeningNow(makeRoomSummary({ scheduled_at: at(0, 13) }), now)
        ).toBe(false);
    });
});

describe('groupByDay', () => {
    it('groups sessions under Today, Tomorrow and later days', () => {
        const rooms = [
            makeRoomSummary({ room_id: 1, scheduled_at: at(0, 14) }),
            makeRoomSummary({ room_id: 2, scheduled_at: at(0, 16) }),
            makeRoomSummary({ room_id: 3, scheduled_at: at(1, 9) }),
            makeRoomSummary({ room_id: 4, scheduled_at: at(3, 9) }),
        ];
        const groups = groupByDay(rooms, now);
        expect(groups.map(([label]) => label)).toEqual([
            'Today',
            'Tomorrow',
            expect.stringContaining('May'),
        ]);
        expect(groups[0][1].map((r) => r.room_id)).toEqual([1, 2]);
    });
});
