import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamMemberInfo } from '../../types';
import WhosAway from './WhosAway';

const getTeamLeave = vi.fn();
const api = { getTeamLeave };
vi.mock('../../hooks', () => ({ useApi: () => api }));

const members = [
    {
        userId: 2,
        sub: 'a',
        givenName: 'Ann',
        familyName: 'X',
        role: 'member',
        joinedAt: '',
    },
] as TeamMemberInfo[];
const now = new Date(2026, 11, 1, 10);

describe('WhosAway', () => {
    beforeEach(() => vi.clearAllMocks());

    it('lists leave in the next four weeks, flagging who is away now', async () => {
        getTeamLeave.mockResolvedValue([
            {
                holidayId: 1,
                userId: 2,
                sub: 'a',
                startDate: '2026-11-30',
                endDate: '2026-12-02',
                dayPart: 'am',
                reason: 'annual_leave',
                note: null,
            },
        ]);
        render(<WhosAway teamId={4} members={members} now={now} />);
        expect(await screen.findByText('Ann X')).toBeInTheDocument();
        expect(screen.getByText('Away now')).toBeInTheDocument();
        expect(screen.getByText(/mornings only/)).toBeInTheDocument();
        expect(getTeamLeave).toHaveBeenCalledWith(
            4,
            '2026-12-01',
            '2026-12-29'
        );
    });

    it('says when nobody is away', async () => {
        getTeamLeave.mockResolvedValue([]);
        render(<WhosAway teamId={4} members={members} now={now} />);
        expect(await screen.findByText(/Nobody has leave/)).toBeInTheDocument();
    });

    it('copes with a failed load', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        getTeamLeave.mockRejectedValue(new Error('down'));
        render(<WhosAway teamId={4} members={members} now={now} />);
        expect(await screen.findByText(/Could not load/)).toBeInTheDocument();
    });
});
