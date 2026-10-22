import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RequireLogin from './RequireLogin';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('./NavBar', () => ({ default: () => <nav /> }));

const mockAuth = (state: { isLoading: boolean; isAuthenticated: boolean }) =>
    vi.mocked(useAuth0).mockReturnValue({
        ...state,
        loginWithRedirect: vi.fn(),
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

    it('asks logged-out visitors to log in instead of loading forever', () => {
        mockAuth({ isLoading: false, isAuthenticated: false });
        render(<RequireLogin invited>secret room</RequireLogin>);
        expect(screen.queryByText('secret room')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Log in to join' })
        ).toBeInTheDocument();
    });
});
