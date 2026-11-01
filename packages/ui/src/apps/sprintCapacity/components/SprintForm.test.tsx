import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamMemberInfo } from '../../../types';
import SprintForm from './SprintForm';

const getSprintForecast = vi.fn();
const addHoliday = vi.fn();
vi.mock('../../../hooks', () => ({
    useApi: () => ({ getSprintForecast, addHoliday }),
}));

const member = (
    userId: number,
    givenName: string,
    jobTitle: TeamMemberInfo['jobTitle'] = null
): TeamMemberInfo => ({
    userId,
    sub: `auth0|${userId}`,
    givenName,
    familyName: 'Smith',
    role: 'member',
    joinedAt: '',
    jobTitle,
});

const members = [member(1, 'Ada', 'lead_developer'), member(2, 'Bob')];
const onSave = vi.fn();

const renderForm = (props: Partial<Parameters<typeof SprintForm>[0]> = {}) =>
    render(
        <SprintForm
            teamId={5}
            members={members}
            mode="plan"
            initial={{
                name: 'Sprint 3',
                startDate: '2026-11-02',
                endDate: '2026-11-13',
            }}
            onSave={onSave}
            {...props}
        />
    );

describe('SprintForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        onSave.mockResolvedValue(true);
        getSprintForecast.mockResolvedValue(null);
        addHoliday.mockResolvedValue({});
    });

    it('starts with everyone picked and shows their job titles', () => {
        renderForm();
        expect(
            screen.getByRole('checkbox', { name: /Ada Smith/ })
        ).toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: /Bob Smith/ })
        ).toBeChecked();
        expect(screen.getByText(/Lead Developer/)).toBeInTheDocument();
    });

    it('saves the sprint with the buffer, carry-over and people chosen', async () => {
        renderForm();
        await userEvent.click(
            screen.getByRole('checkbox', { name: /Bob Smith/ })
        );
        await userEvent.clear(screen.getByLabelText('Buffer (%)'));
        await userEvent.type(screen.getByLabelText('Buffer (%)'), '15');
        await userEvent.clear(screen.getByLabelText('Carried-over points'));
        await userEvent.type(screen.getByLabelText('Carried-over points'), '6');
        await userEvent.clear(screen.getByLabelText('Carried-over tickets'));
        await userEvent.type(
            screen.getByLabelText('Carried-over tickets'),
            '2'
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create sprint' })
        );
        expect(onSave).toHaveBeenCalledWith({
            name: 'Sprint 3',
            startDate: '2026-11-02',
            endDate: '2026-11-13',
            bufferPercent: 15,
            carriedOverPoints: 6,
            carriedOverTickets: 2,
            memberIds: [1],
        });
    });

    it('asks for the points planned and completed when adding a past sprint', async () => {
        renderForm({ mode: 'history' });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add past sprint' })
        );
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Enter the points planned and completed'
        );

        await userEvent.type(screen.getByLabelText('Points planned'), '30');
        await userEvent.type(screen.getByLabelText('Points completed'), '24');
        await userEvent.click(
            screen.getByRole('button', { name: 'Add past sprint' })
        );
        expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ plannedPoints: 30, completedPoints: 24 })
        );
    });

    it('will not save without anyone in the sprint', async () => {
        renderForm();
        await userEvent.click(
            screen.getByRole('checkbox', { name: /Ada Smith/ })
        );
        await userEvent.click(
            screen.getByRole('checkbox', { name: /Bob Smith/ })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create sprint' })
        );
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(
            'at least one person'
        );
    });

    it('says so when the save fails', async () => {
        onSave.mockResolvedValue(false);
        renderForm();
        await userEvent.click(
            screen.getByRole('button', { name: 'Create sprint' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Could not save the sprint'
        );
    });

    it("adds someone's leave inside the sprint window and refreshes the forecast", async () => {
        renderForm({ mode: 'history' });
        await screen.findByRole('button', { name: 'Add leave for Ada Smith' });
        const calls = getSprintForecast.mock.calls.length;
        await userEvent.click(
            screen.getByRole('button', { name: 'Add leave for Ada Smith' })
        );
        await userEvent.selectOptions(screen.getByLabelText('Days'), 'am');
        await userEvent.click(
            screen.getByRole('button', { name: 'Add leave', hidden: false })
        );
        expect(addHoliday).toHaveBeenCalledWith(
            {
                startDate: '2026-11-02',
                endDate: '2026-11-02',
                dayPart: 'am',
                reason: 'annual_leave',
            },
            1
        );
        // adding leave does not submit the sprint
        expect(onSave).not.toHaveBeenCalled();
        await vi.waitFor(() =>
            expect(getSprintForecast.mock.calls.length).toBeGreaterThan(calls)
        );
    });

    it('offers Add leave before the dates are filled in, and asks for them', async () => {
        renderForm({ mode: 'history', initial: { name: 'Sprint 1' } });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add leave for Ada Smith' })
        );
        expect(
            screen.getByText(/Pick the sprint's start and end dates first/)
        ).toBeInTheDocument();
        expect(screen.queryByLabelText('Leave from')).not.toBeInTheDocument();
    });
});
