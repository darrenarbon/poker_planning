import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserProfile } from '../../types';
import ProfileSettings from './ProfileSettings';

const save = vi.fn();
let profile: UserProfile | undefined;
let error: string | null = null;
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('../../hooks', () => ({
    useProfile: () => ({ profile, error, save }),
}));

describe('ProfileSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        save.mockResolvedValue(true);
        profile = { givenName: 'Ada', familyName: 'Lovelace' };
        error = null;
        vi.mocked(useAuth0).mockReturnValue({
            user: { given_name: 'Auth', family_name: 'Zero' },
        } as unknown as ReturnType<typeof useAuth0>);
    });

    it("starts from the login's name when none is stored", () => {
        profile = { givenName: '', familyName: '' };
        render(<ProfileSettings />);
        expect(screen.getByLabelText('Given name')).toHaveValue('Auth');
        expect(screen.getByLabelText('Family name')).toHaveValue('Zero');
    });

    it('shows the current name', () => {
        render(<ProfileSettings />);
        expect(screen.getByLabelText('Given name')).toHaveValue('Ada');
        expect(screen.getByLabelText('Family name')).toHaveValue('Lovelace');
    });

    it('saves a changed, trimmed name', async () => {
        render(<ProfileSettings />);
        const given = screen.getByLabelText('Given name');
        await userEvent.clear(given);
        await userEvent.type(given, ' Grace ');
        const family = screen.getByLabelText('Family name');
        await userEvent.clear(family);
        await userEvent.type(family, 'Hopper');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save name' })
        );

        expect(save).toHaveBeenCalledWith({
            givenName: 'Grace',
            familyName: 'Hopper',
        });
        expect(await screen.findByRole('status')).toHaveTextContent('Saved');
    });

    it('does not say saved when saving fails', async () => {
        save.mockResolvedValue(false);
        render(<ProfileSettings />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Save name' })
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('cannot be saved until the name has loaded', () => {
        profile = undefined;
        render(<ProfileSettings />);
        expect(
            screen.getByRole('button', { name: 'Save name' })
        ).toBeDisabled();
    });
});
