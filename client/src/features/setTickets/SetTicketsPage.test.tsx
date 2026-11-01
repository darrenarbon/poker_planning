import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAuthUser, makeRoom, makeTicket } from '../../test/factories';
import SetTicketsPage from './SetTicketsPage';

const navigate = vi.fn();
const api = {
    getRoom: vi.fn(),
    saveTickets: vi.fn(),
    updateBaseUrl: vi.fn(),
};
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigate,
    useParams: () => ({ roomName: 'room-abc' }),
}));
vi.mock('../../hooks', () => ({ useApi: () => api }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));

const room = makeRoom({ ticketBaseUrl: 'https://jira.example.com/browse' });

const renderPage = async () => {
    render(<SetTicketsPage />);
    await screen.findByText(/Add tickets to/);
};

const ticketBox = () => screen.getByLabelText('Ticket IDs');
const baseUrlBox = () => screen.getByLabelText('Base URL for tickets');

describe('SetTicketsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(useAuth0).mockReturnValue({
            user: makeAuthUser(),
        } as unknown as ReturnType<typeof useAuth0>);
        api.getRoom.mockResolvedValue({ room, tickets: [], users: [] });
        api.saveTickets.mockResolvedValue(undefined);
        api.updateBaseUrl.mockResolvedValue(undefined);
    });

    it('renders nothing but the nav when logged out', () => {
        vi.mocked(useAuth0).mockReturnValue({
            user: undefined,
        } as unknown as ReturnType<typeof useAuth0>);
        render(<SetTicketsPage />);
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows the room and its current base url to check', async () => {
        await renderPage();
        expect(
            screen.getByText(`Add tickets to ${room.friendlyName}`)
        ).toBeInTheDocument();
        expect(baseUrlBox()).toHaveValue('https://jira.example.com/browse');
        expect(
            screen.getByRole('link', {
                name: 'https://jira.example.com/browse/ABC-123',
            })
        ).toBeInTheDocument();
    });

    it('saves the parsed, de-duplicated ticket list and goes to voting', async () => {
        await renderPage();
        await userEvent.type(ticketBox(), ' ABC-1, ,ABC-2 ABC-1{enter}ABC-3');
        expect(screen.getByText('3 tickets to add')).toBeInTheDocument();
        expect(screen.getByText(/1 duplicate ignored/)).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Save 3 tickets and start' })
        );

        expect(api.saveTickets).toHaveBeenCalledWith('room-abc', [
            'ABC-1',
            'ABC-2',
            'ABC-3',
        ]);
        expect(api.updateBaseUrl).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith('/room/room-abc/voting');
    });

    it('lets a ticket be removed before saving', async () => {
        await renderPage();
        await userEvent.type(ticketBox(), 'ABC-1, ABC-2');
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove ABC-1' })
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Save 1 ticket and start' })
        );
        expect(api.saveTickets).toHaveBeenCalledWith('room-abc', ['ABC-2']);
    });

    it('skips tickets already in the room', async () => {
        api.getRoom.mockResolvedValue({
            room,
            tickets: [makeTicket({ ticket_number: 'ABC-1' })],
            users: [],
        });
        await renderPage();
        await userEvent.type(ticketBox(), 'ABC-1, ABC-2');
        expect(screen.getByText(/Already in room: ABC-1/)).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Save 1 ticket and start' })
        );
        expect(api.saveTickets).toHaveBeenCalledWith('room-abc', ['ABC-2']);
    });

    it('saves a corrected base url', async () => {
        await renderPage();
        await userEvent.clear(baseUrlBox());
        await userEvent.type(baseUrlBox(), 'https://other.example.com/browse/');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save and start' })
        );
        expect(api.updateBaseUrl).toHaveBeenCalledWith(
            'room-abc',
            'https://other.example.com/browse'
        );
        expect(api.saveTickets).not.toHaveBeenCalled();
    });

    it('can skip straight to voting', async () => {
        await renderPage();
        await userEvent.click(
            screen.getByRole('button', { name: 'Skip for now' })
        );
        expect(navigate).toHaveBeenCalledWith('/room/room-abc/voting');
    });

    it('shows an error and stays on the page when saving fails', async () => {
        api.saveTickets.mockRejectedValue(new Error('boom'));
        await renderPage();
        await userEvent.type(ticketBox(), 'ABC-1');
        await userEvent.click(
            screen.getByRole('button', { name: 'Save 1 ticket and start' })
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Could not save tickets'
        );
        expect(navigate).not.toHaveBeenCalled();
    });
});
