import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser } from '../../test/factories';
import SetTicketsPage from './SetTicketsPage';

const navigate = vi.fn();
const saveTickets = vi.fn();
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigate,
    useParams: () => ({ roomName: 'room-abc' }),
}));
vi.mock('../../hooks', () => ({ useApi: () => ({ saveTickets }) }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));

describe('SetTicketsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(useAuth0).mockReturnValue({
            user: makeAuthUser(),
        } as unknown as ReturnType<typeof useAuth0>);
    });

    it('renders nothing but the nav when logged out', () => {
        vi.mocked(useAuth0).mockReturnValue({
            user: undefined,
        } as unknown as ReturnType<typeof useAuth0>);
        render(<SetTicketsPage />);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('saves the trimmed, non-empty ticket list and goes to voting', async () => {
        saveTickets.mockResolvedValue(undefined);
        render(<SetTicketsPage />);
        expect(screen.getByText('Set Tickets for Room room-abc')).toBeVisible();

        await userEvent.type(screen.getByRole('textbox'), ' ABC-1, ,ABC-2 ,');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Tickets' })
        );

        expect(saveTickets).toHaveBeenCalledWith('room-abc', [
            'ABC-1',
            'ABC-2',
        ]);
        expect(navigate).toHaveBeenCalledWith('/room/room-abc/voting');
    });

    it('shows an error and stays on the page when saving fails', async () => {
        saveTickets.mockRejectedValue(new Error('boom'));
        render(<SetTicketsPage />);
        await userEvent.type(screen.getByRole('textbox'), 'ABC-1');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save Tickets' })
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Could not save tickets'
        );
        expect(navigate).not.toHaveBeenCalled();
    });
});
