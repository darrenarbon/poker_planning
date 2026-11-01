import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamsPage from './TeamsPage';

const navigate = vi.fn();
const createTeam = vi.fn();
const reload = vi.fn();
let myTeams: { teams: unknown[]; isSuperAdmin: boolean } = {
    teams: [],
    isSuperAdmin: false,
};

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('../../hooks', () => ({
    useApi: () => ({ createTeam }),
    useMyTeams: () => ({ ...myTeams, loaded: true, error: null, reload }),
}));

describe('TeamsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        myTeams = { teams: [], isSuperAdmin: false };
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('explains how to get into a team when the user has none', () => {
        render(<TeamsPage />);
        expect(
            screen.getByText(/You are not in a team yet/)
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Team name')).toBeInTheDocument();
        expect(screen.getByLabelText('Invite link')).toBeInTheDocument();
    });

    it('lists teams with size and role', () => {
        myTeams = {
            isSuperAdmin: false,
            teams: [
                {
                    team_id: 7,
                    name: 'Platform',
                    created_at: '',
                    role: 'admin',
                    member_count: 3,
                },
            ],
        };
        render(<TeamsPage />);
        const link = screen.getByRole('link', { name: /Platform/ });
        expect(link).toHaveAttribute('href', '/teams/7');
        expect(link).toHaveTextContent('3 people · Admin');
    });

    it('labels teams a super admin is not in', () => {
        myTeams = {
            isSuperAdmin: true,
            teams: [
                {
                    team_id: 7,
                    name: 'Other',
                    created_at: '',
                    role: null,
                    member_count: 1,
                },
            ],
        };
        render(<TeamsPage />);
        expect(screen.getByRole('link', { name: /Other/ })).toHaveTextContent(
            '1 person · Super admin'
        );
    });

    it('creates a team and opens it', async () => {
        createTeam.mockResolvedValue({ team_id: 9, name: 'New' });
        render(<TeamsPage />);
        await userEvent.type(screen.getByLabelText('Team name'), ' New ');
        await userEvent.click(
            screen.getByRole('button', { name: 'Create team' })
        );
        expect(createTeam).toHaveBeenCalledWith('New');
        expect(navigate).toHaveBeenCalledWith('/teams/9');
    });

    it('asks for a name before creating', async () => {
        render(<TeamsPage />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Create team' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent('give your team');
        expect(createTeam).not.toHaveBeenCalled();
    });

    it('goes to the invite page for a pasted link', async () => {
        render(<TeamsPage />);
        await userEvent.type(
            screen.getByLabelText('Invite link'),
            'https://x.test/invite/tok123'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
        expect(navigate).toHaveBeenCalledWith('/invite/tok123');
    });
});
