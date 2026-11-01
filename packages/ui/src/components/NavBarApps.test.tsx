import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser } from '../test/factories';
import NavBar from './NavBar';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
// two finished apps, as there will be once another one is ready
vi.mock('../apps', () => {
    const live = [
        { id: 'a', name: 'First App', tagline: 'One', path: '/a', icon: '1' },
        { id: 'b', name: 'Second App', tagline: 'Two', path: '/b', icon: '2' },
    ];
    return {
        liveApps: live,
        findCurrentApp: (path: string) =>
            live.find((app) => path.startsWith(app.path)),
    };
});

describe('NavBar with several apps', () => {
    beforeEach(() => {
        window.history.pushState({}, '', '/');
        vi.mocked(useAuth0).mockReturnValue({
            user: makeAuthUser(),
            logout: vi.fn(),
            loginWithRedirect: vi.fn(),
        } as unknown as ReturnType<typeof useAuth0>);
    });

    it('puts them in an Apps menu', () => {
        render(<NavBar />);
        expect(
            screen.getByRole('button', { name: 'Apps' })
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /First App/ })).toHaveAttribute(
            'href',
            '/a'
        );
        expect(
            screen.getByRole('link', { name: /Second App/ })
        ).toHaveAttribute('href', '/b');
    });

    it('names the menu after the app being used', () => {
        window.history.pushState({}, '', '/b/home');
        render(<NavBar />);
        expect(
            screen.getByRole('button', { name: 'Second App' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Second App/ })
        ).toHaveAttribute('aria-current', 'page');
    });
});
