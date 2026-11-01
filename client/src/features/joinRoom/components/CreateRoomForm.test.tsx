import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TICKET_BASE_URL } from '../../../constants';
import CreateRoomForm from './CreateRoomForm';

const navigate = vi.fn();
const createRoom = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
let settings: { defaultBaseUrl?: string } = {};
vi.mock('../../../hooks', () => ({
    useApi: () => ({ createRoom }),
    useUserSettings: () => ({ settings }),
}));

describe('CreateRoomForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        settings = {};
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('pre-fills the default ticket base URL', () => {
        render(<CreateRoomForm />);
        expect(screen.getByLabelText(/Base URL/)).toHaveValue(
            DEFAULT_TICKET_BASE_URL
        );
    });

    it("pre-fills the user's saved default base URL", () => {
        settings = { defaultBaseUrl: 'https://mine.example.com/browse' };
        render(<CreateRoomForm />);
        expect(screen.getByLabelText(/Base URL/)).toHaveValue(
            'https://mine.example.com/browse'
        );
    });

    it('shows an error when the room name is missing', async () => {
        render(<CreateRoomForm />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Create room' })
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Please enter a room name'
        );
        expect(createRoom).not.toHaveBeenCalled();
    });

    it('creates the room with a normalised URL and navigates to set tickets', async () => {
        createRoom.mockResolvedValue('new-room');
        render(<CreateRoomForm />);
        await userEvent.type(screen.getByLabelText(/Room Name/), 'Planning');
        const baseUrl = screen.getByLabelText(/Base URL/);
        await userEvent.clear(baseUrl);
        await userEvent.type(baseUrl, ' https://jira.example.com/browse/ ');
        await userEvent.click(
            screen.getByRole('button', { name: 'Create room' })
        );

        expect(createRoom).toHaveBeenCalledWith(
            'Planning',
            'https://jira.example.com/browse'
        );
        expect(navigate).toHaveBeenCalledWith('/room/new-room/tickets');
    });

    it('shows a dismissible error when creation fails', async () => {
        createRoom.mockRejectedValue(new Error('boom'));
        render(<CreateRoomForm />);
        await userEvent.type(screen.getByLabelText(/Room Name/), 'Planning');
        await userEvent.click(
            screen.getByRole('button', { name: 'Create room' })
        );

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Failed to create room'
        );
        expect(navigate).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
