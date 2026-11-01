import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Holiday } from '../../types';
import NextLeaveCard from './NextLeaveCard';

let holidays: Holiday[] = [];
let loaded = true;
vi.mock('../../hooks', () => ({
    useHolidays: () => ({ holidays, loaded }),
}));

const now = new Date(2026, 11, 1, 10);

describe('NextLeaveCard', () => {
    beforeEach(() => {
        holidays = [];
        loaded = true;
    });

    it('shows the next planned leave with a countdown', () => {
        holidays = [
            {
                holidayId: 1,
                userId: 1,
                startDate: '2026-12-11',
                endDate: '2026-12-15',
                dayPart: 'full',
                reason: 'annual_leave',
                note: null,
            },
        ];
        render(<NextLeaveCard now={now} />);
        expect(screen.getByText(/Starts in 10 days/)).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Manage leave' })
        ).toHaveAttribute('href', '/annual-leave');
    });

    it('nudges to add leave when there is none', () => {
        render(<NextLeaveCard now={now} />);
        expect(screen.getByText('No leave planned yet.')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Add leave' })
        ).toBeInTheDocument();
    });

    it('shows nothing until loaded', () => {
        loaded = false;
        const { container } = render(<NextLeaveCard now={now} />);
        expect(container).toBeEmptyDOMElement();
    });
});
