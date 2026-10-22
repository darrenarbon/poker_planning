import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser } from '../test/factories';
import NavBar from './NavBar';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));

const logout = vi.fn();
const loginWithRedirect = vi.fn();

const mockAuth = (user?: ReturnType<typeof makeAuthUser>) =>
    vi.mocked(useAuth0).mockReturnValue({
        user,
        logout,
        loginWithRedirect,
    } as unknown as ReturnType<typeof useAuth0>);

describe('NavBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows a login button when logged out', async () => {
        mockAuth();
        render(<NavBar />);
        await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
        expect(loginWithRedirect).toHaveBeenCalled();
        expect(
            screen.queryByRole('button', { name: 'Log out' })
        ).not.toBeInTheDocument();
    });

    it("shows the user's initials and a log out option when logged in", async () => {
        mockAuth(makeAuthUser());
        render(<NavBar />);
        expect(screen.getByText('AL')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
        expect(logout).toHaveBeenCalled();
    });

    it('links to the join and new room pages when logged in', () => {
        mockAuth(makeAuthUser());
        render(<NavBar />);
        expect(screen.getByRole('link', { name: 'Join room' })).toHaveAttribute(
            'href',
            '/rooms/join'
        );
        expect(screen.getByRole('link', { name: 'New room' })).toHaveAttribute(
            'href',
            '/rooms/new'
        );
    });

    it('points the menu toggle at the collapsible menu', () => {
        mockAuth();
        const { container } = render(<NavBar />);
        const target = screen
            .getByRole('button', { name: 'Toggle navigation' })
            .getAttribute('data-bs-target');
        expect(container.querySelector(target!)).toHaveClass('navbar-collapse');
    });
});
