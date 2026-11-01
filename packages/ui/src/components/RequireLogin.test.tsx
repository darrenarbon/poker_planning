import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RequireLogin from './RequireLogin';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('./NavBar', () => ({ default: () => <nav /> }));

const loginWithRedirect = vi.fn();

const mockAuth = (state: { isLoading: boolean; isAuthenticated: boolean }) =>
    vi.mocked(useAuth0).mockReturnValue({
        ...state,
        loginWithRedirect,
    } as unknown as ReturnType<typeof useAuth0>);

describe('RequireLogin', () => {
    it('shows the page when logged in', () => {
        mockAuth({ isLoading: false, isAuthenticated: true });
        render(<RequireLogin>secret room</RequireLogin>);
        expect(screen.getByText('secret room')).toBeInTheDocument();
    });

    it('shows a loader while auth is restoring the session', () => {
        mockAuth({ isLoading: true, isAuthenticated: false });
        const { container } = render(<RequireLogin>secret room</RequireLogin>);
        expect(container.querySelector('.loader')).toBeInTheDocument();
        expect(screen.queryByText('secret room')).not.toBeInTheDocument();
    });

    it('asks logged-out visitors to log in instead of loading forever', async () => {
        mockAuth({ isLoading: false, isAuthenticated: false });
        render(<RequireLogin>secret room</RequireLogin>);
        expect(screen.queryByText('secret room')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
        expect(loginWithRedirect).toHaveBeenCalled();
    });

    it("shows the page's own logged-out screen when it has one", () => {
        mockAuth({ isLoading: false, isAuthenticated: false });
        render(
            <RequireLogin loggedOut={<p>join the room</p>}>
                secret room
            </RequireLogin>
        );
        expect(screen.getByText('join the room')).toBeInTheDocument();
    });
});
