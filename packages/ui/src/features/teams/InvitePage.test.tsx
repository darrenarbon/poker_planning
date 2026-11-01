import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api';
import InvitePage from './InvitePage';

const navigate = vi.fn();
const api = {
    login: vi.fn(),
    previewInvite: vi.fn(),
    acceptInvite: vi.fn(),
};

// stable references, like the real hooks, or the page's effect re-runs forever
const auth = { user: { sub: 'me' } };
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => auth }));
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigate,
    useParams: () => ({ token: 'tok' }),
}));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('../../hooks', () => ({ useApi: () => api }));

describe('InvitePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.login.mockResolvedValue(undefined);
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('registers the user, shows the team and joins on confirmation', async () => {
        api.previewInvite.mockResolvedValue({
            teamId: 4,
            teamName: 'Platform',
            role: 'member',
            alreadyMember: false,
        });
        api.acceptInvite.mockResolvedValue({ teamId: 4 });
        render(<InvitePage />);

        expect(await screen.findByText('Join Platform?')).toBeInTheDocument();
        expect(api.login).toHaveBeenCalled();
        await userEvent.click(
            screen.getByRole('button', { name: 'Join team' })
        );
        expect(api.acceptInvite).toHaveBeenCalledWith('tok');
        expect(navigate).toHaveBeenCalledWith('/teams/4');
    });

    it('says so when already in the team', async () => {
        api.previewInvite.mockResolvedValue({
            teamId: 4,
            teamName: 'Platform',
            role: 'member',
            alreadyMember: true,
        });
        render(<InvitePage />);
        expect(
            await screen.findByText('You are already in Platform')
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Join team' })
        ).not.toBeInTheDocument();
    });

    it('explains a dead link', async () => {
        api.previewInvite.mockRejectedValue(new ApiError('gone', 410));
        render(<InvitePage />);
        expect(
            await screen.findByText('This invite is no longer valid')
        ).toBeInTheDocument();
    });

    it('shows an error when the invite cannot be loaded', async () => {
        api.previewInvite.mockRejectedValue(new ApiError('boom', 500));
        render(<InvitePage />);
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Could not load this invite'
        );
    });
});
