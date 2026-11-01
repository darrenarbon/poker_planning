import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser } from '../../test/factories';
import HomePage from './HomePage';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('./Dashboard', () => ({
    default: ({ givenName }: { givenName?: string }) => (
        <h1>Welcome back, {givenName}</h1>
    ),
}));

const loginWithRedirect = vi.fn();

const mockAuth = (state: Partial<ReturnType<typeof useAuth0>>) =>
    vi.mocked(useAuth0).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        loginWithRedirect,
        ...state,
    } as unknown as ReturnType<typeof useAuth0>);

const expectAppTiles = () => {
    expect(
        screen.getByRole('link', { name: 'Planning Poker' })
    ).toHaveAttribute('href', '/poker');
    // apps that are not ready are not advertised
    expect(
        screen.queryByRole('link', { name: 'Sprint Capacity Planner' })
    ).not.toBeInTheDocument();
    expect(
        screen.queryByRole('link', { name: 'Skills Matrix' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
};

describe('HomePage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows the loader while auth is restoring the session', () => {
        mockAuth({ isLoading: true });
        const { container } = render(<HomePage />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
    });

    it('introduces the apps and asks visitors to log in', async () => {
        mockAuth({});
        render(<HomePage />);
        expectAppTiles();
        await userEvent.click(
            screen.getByRole('button', { name: 'Log in to get started' })
        );
        expect(loginWithRedirect).toHaveBeenCalled();
    });

    it('shows logged-in users their dashboard, greeting them by first name', () => {
        mockAuth({ isAuthenticated: true, user: makeAuthUser() });
        render(<HomePage />);
        expect(
            screen.getByRole('heading', { name: 'Welcome back, Ada' })
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Log in/ })
        ).not.toBeInTheDocument();
    });
});
