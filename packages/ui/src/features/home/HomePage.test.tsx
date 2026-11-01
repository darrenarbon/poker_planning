import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser } from '../../test/factories';
import HomePage from './HomePage';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));

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
    expect(
        screen.getByRole('link', { name: 'Sprint Capacity Planner' })
    ).toHaveAttribute('href', '/capacity');
    expect(screen.getByRole('link', { name: 'Skills Matrix' })).toHaveAttribute(
        'href',
        '/skills'
    );
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
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

    it('welcomes back logged-in users and lists the apps', () => {
        mockAuth({ isAuthenticated: true, user: makeAuthUser() });
        render(<HomePage />);
        expect(
            screen.getByRole('heading', { name: /Welcome back, / })
        ).toBeInTheDocument();
        expectAppTiles();
        expect(
            screen.queryByRole('button', { name: /Log in/ })
        ).not.toBeInTheDocument();
    });
});
