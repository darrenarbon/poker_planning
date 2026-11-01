import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LoggedOutWelcome from './LoggedOutWelcome';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));

describe('LoggedOutWelcome', () => {
    it('logs the user in from the call to action', async () => {
        const loginWithRedirect = vi.fn();
        vi.mocked(useAuth0).mockReturnValue({
            loginWithRedirect,
        } as unknown as ReturnType<typeof useAuth0>);
        render(<LoggedOutWelcome />);
        expect(screen.getByText('Create a room')).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Log in to get started' })
        );
        expect(loginWithRedirect).toHaveBeenCalledWith({
            appState: { returnTo: '/' },
        });
    });

    it('invites visitors from a shared room link to log in and join', () => {
        vi.mocked(useAuth0).mockReturnValue({
            loginWithRedirect: vi.fn(),
        } as unknown as ReturnType<typeof useAuth0>);
        render(<LoggedOutWelcome invited />);
        expect(
            screen.getByText("You've been invited to a planning session")
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Log in to join' })
        ).toBeInTheDocument();
        expect(screen.queryByText('Create a room')).not.toBeInTheDocument();
    });
});
