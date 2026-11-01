import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Holiday } from '../../types';
import HolidaysPanel from './HolidaysPanel';

const add = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const importBankHolidays = vi.fn();
let holidays: Holiday[] = [];
vi.mock('../../hooks', async () => ({
    ...(await vi.importActual<object>('../../hooks/useConfirm')),
    useHolidays: () => ({
        holidays,
        loaded: true,
        error: null,
        add,
        update,
        remove,
        importBankHolidays,
    }),
}));

const holiday = (overrides: Partial<Holiday> = {}): Holiday => ({
    holidayId: 1,
    userId: 1,
    startDate: '2999-12-24',
    endDate: '2999-12-31',
    dayPart: 'full',
    reason: 'annual_leave',
    note: 'Skiing',
    ...overrides,
});

describe('HolidaysPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        add.mockResolvedValue(true);
        update.mockResolvedValue(true);
        remove.mockResolvedValue(true);
        holidays = [];
    });

    it('adds a half-day holiday with a reason', async () => {
        render(<HolidaysPanel />);
        await userEvent.clear(screen.getByLabelText('From'));
        await userEvent.type(screen.getByLabelText('From'), '2999-05-01');
        await userEvent.selectOptions(
            screen.getByLabelText('Length of each day'),
            'pm'
        );
        await userEvent.selectOptions(
            screen.getByLabelText('Reason'),
            'birthday_leave'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add leave' })
        );

        expect(add).toHaveBeenCalledWith({
            startDate: '2999-05-01',
            endDate: '2999-05-01',
            dayPart: 'pm',
            reason: 'birthday_leave',
            note: undefined,
        });
        expect(await screen.findByRole('status')).toHaveTextContent(
            'Leave added'
        );
    });

    it('lists holidays and edits one', async () => {
        holidays = [holiday()];
        render(<HolidaysPanel />);
        expect(screen.getByText(/Skiing/)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: /Edit/ }));
        expect(screen.getByLabelText('Note (optional)')).toHaveValue('Skiing');
        await userEvent.selectOptions(
            screen.getByLabelText('Reason'),
            'sickness'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save leave' })
        );
        expect(update).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ reason: 'sickness', note: 'Skiing' })
        );
    });

    it('deletes after confirming', async () => {
        holidays = [holiday()];
        render(<HolidaysPanel />);
        await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
        const dialog = screen.getByRole('dialog');
        await userEvent.click(
            within(dialog).getByRole('button', { name: 'Delete' })
        );
        expect(remove).toHaveBeenCalledWith(1);
    });

    it('imports bank holidays for the chosen region', async () => {
        importBankHolidays.mockResolvedValue(3);
        render(<HolidaysPanel />);
        await userEvent.selectOptions(
            screen.getByLabelText('Region'),
            'scotland'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add bank holidays' })
        );
        expect(importBankHolidays).toHaveBeenCalledWith('scotland', undefined);
        expect(await screen.findByRole('status')).toHaveTextContent(
            'Added 3 bank holidays'
        );
    });

    it('lets Spain pick a community', async () => {
        importBankHolidays.mockResolvedValue(0);
        render(<HolidaysPanel />);
        await userEvent.selectOptions(screen.getByLabelText('Region'), 'spain');
        await userEvent.selectOptions(
            screen.getByLabelText('Community'),
            'ES-CT'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add bank holidays' })
        );
        expect(importBankHolidays).toHaveBeenCalledWith('spain', 'ES-CT');
        expect(await screen.findByRole('status')).toHaveTextContent(
            'already up to date'
        );
    });
});
