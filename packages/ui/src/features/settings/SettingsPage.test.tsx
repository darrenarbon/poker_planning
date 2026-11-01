import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';

vi.mock('../../components/NavBar', () => ({ default: () => null }));
vi.mock('./ProfileSettings', () => ({ default: () => <p>profile form</p> }));
vi.mock('./PlanningPokerSettings', () => ({
    default: () => <p>planning poker form</p>,
}));

describe('SettingsPage', () => {
    it('has a section for the profile and one for each app', () => {
        render(<SettingsPage />);
        expect(
            screen.getByRole('heading', { name: 'Settings' })
        ).toBeInTheDocument();
        expect(screen.getByText('profile form')).toBeInTheDocument();
        expect(screen.getByText('planning poker form')).toBeInTheDocument();
    });
});
