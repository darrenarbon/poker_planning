import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSettings } from '../../types';
import SettingsPage from './SettingsPage';

const save = vi.fn();
let settings: UserSettings = {};
vi.mock('../../components/NavBar', () => ({ default: () => null }));
vi.mock('../../hooks', () => ({
    useUserSettings: () => ({ settings, loaded: true, error: null, save }),
}));

describe('SettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        save.mockResolvedValue(true);
        settings = {};
    });

    it('shows the saved settings', () => {
        settings = {
            defaultBaseUrl: 'https://jira.example.com/browse',
            theme: 'dark',
            exemplars: [{ estimate: 3, ticketNumber: 'PP-3' }],
        };
        render(<SettingsPage />);
        expect(screen.getByLabelText(/Default base URL/)).toHaveValue(
            'https://jira.example.com/browse'
        );
        expect(screen.getByLabelText('Dark')).toBeChecked();
        expect(screen.getByText('PP-3')).toBeInTheDocument();
    });

    it('saves a base URL, theme and new exemplar', async () => {
        render(<SettingsPage />);
        await userEvent.type(
            screen.getByLabelText(/Default base URL/),
            ' https://mine.example.com/browse/ '
        );
        await userEvent.click(screen.getByLabelText('Light'));
        await userEvent.selectOptions(screen.getByLabelText('Estimate'), '5');
        await userEvent.type(screen.getByLabelText('Ticket'), 'PP-5{Enter}');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save settings' })
        );

        expect(save).toHaveBeenCalledWith({
            defaultBaseUrl: 'https://mine.example.com/browse',
            theme: 'light',
            exemplars: [{ estimate: 5, ticketNumber: 'PP-5' }],
        });
        expect(await screen.findByRole('status')).toHaveTextContent('Saved');
    });

    it('removes an exemplar and clears unset defaults', async () => {
        settings = { exemplars: [{ estimate: 1, ticketNumber: 'PP-1' }] };
        render(<SettingsPage />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove PP-1' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save settings' })
        );
        expect(save).toHaveBeenCalledWith({
            defaultBaseUrl: undefined,
            theme: undefined,
            exemplars: [],
        });
    });
});
