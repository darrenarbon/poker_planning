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
        window.history.pushState({}, '', '/');
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

    it('links to the apps that are ready, and none that are not', () => {
        mockAuth(makeAuthUser());
        render(<NavBar />);
        expect(
            screen.getByRole('link', { name: /Planning Poker/ })
        ).toHaveAttribute('href', '/poker');
        expect(
            screen.getByRole('link', { name: /Sprint Capacity Planner/ })
        ).toHaveAttribute('href', '/capacity');
        expect(
            screen.queryByRole('link', { name: /Skills Matrix/ })
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Soon/)).not.toBeInTheDocument();
    });

    it('puts the finished apps in an Apps menu', () => {
        mockAuth(makeAuthUser());
        render(<NavBar />);
        expect(
            screen.getByRole('button', { name: 'Apps' })
        ).toBeInTheDocument();
    });

    it('marks the app being used as the current page', () => {
        window.history.pushState({}, '', '/poker/rooms/new');
        mockAuth(makeAuthUser());
        render(<NavBar />);
        expect(
            screen.getByRole('link', { name: /Planning Poker/ })
        ).toHaveAttribute('aria-current', 'page');
    });

    it('only offers keyboard shortcuts in planning poker', () => {
        mockAuth(makeAuthUser());
        window.history.pushState({}, '', '/poker/room/abc/voting');
        const { unmount } = render(<NavBar />);
        expect(
            screen.getByRole('button', { name: 'Keyboard shortcuts' })
        ).toBeInTheDocument();
        unmount();

        window.history.pushState({}, '', '/teams');
        render(<NavBar />);
        expect(
            screen.queryByRole('button', { name: 'Keyboard shortcuts' })
        ).not.toBeInTheDocument();
    });

    it('points the menu toggle at the collapsible menu', () => {
        mockAuth();
        const { container } = render(<NavBar />);
        const target = screen
            .getByRole('button', { name: 'Toggle navigation' })
            .getAttribute('data-bs-target');
        expect(container.querySelector(target!)).toHaveClass('navbar-collapse');
    });

    it('links to teams', () => {
        window.history.pushState({}, '', '/teams/3');
        mockAuth(makeAuthUser());
        render(<NavBar />);
        const link = screen.getByRole('link', { name: 'Teams' });
        expect(link).toHaveAttribute('href', '/teams');
        expect(link).toHaveAttribute('aria-current', 'page');
    });

    it('switches between light and dark from the account menu', async () => {
        mockAuth(makeAuthUser());
        document.documentElement.setAttribute('data-bs-theme', 'light');
        render(<NavBar />);
        const toggle = screen.getByRole('button', {
            name: /(Dark|Light) mode/,
        });
        const before = toggle.textContent;
        await userEvent.click(toggle);
        expect(
            screen.getByRole('button', { name: /(Dark|Light) mode/ })
                .textContent
        ).not.toBe(before);
    });

    it('keeps the theme switch within reach when logged out', async () => {
        mockAuth();
        render(<NavBar />);
        const toggle = screen.getByRole('button', { name: /^Switch to/ });
        const before = toggle.getAttribute('aria-label');
        await userEvent.click(toggle);
        expect(
            screen.getByRole('button', { name: /^Switch to/ })
        ).not.toHaveAttribute('aria-label', before);
    });
});
