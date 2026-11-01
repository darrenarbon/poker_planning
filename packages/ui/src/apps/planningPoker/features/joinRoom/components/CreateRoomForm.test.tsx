import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TICKET_BASE_URL } from '../../../../../constants';
import CreateRoomForm from './CreateRoomForm';

const navigate = vi.fn();
const createRoom = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
let settings: { defaultBaseUrl?: string } = {};
vi.mock('../../../../../hooks', () => ({
    useApi: () => ({ createRoom }),
    useUserSettings: () => ({ settings }),
    useMyTeams: () => ({ teams: [] }),
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
        fireEvent.change(screen.getByLabelText(/Planning date and time/), {
            target: { value: '2030-05-01T10:30' },
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Create room' })
        );

        expect(createRoom).toHaveBeenCalledWith(
            'Planning',
            'https://jira.example.com/browse',
            new Date('2030-05-01T10:30').toISOString(),
            undefined
        );
        expect(navigate).toHaveBeenCalledWith('/poker/room/new-room/tickets');
    });

    it('starts the planning time at the next half hour', () => {
        render(<CreateRoomForm />);
        const value = (
            screen.getByLabelText(/Planning date and time/) as HTMLInputElement
        ).value;
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:(00|30)$/);
        expect(new Date(value).getTime()).toBeGreaterThan(Date.now());
    });

    it('needs a planning time before creating the room', async () => {
        render(<CreateRoomForm />);
        await userEvent.type(screen.getByLabelText(/Room Name/), 'Planning');
        fireEvent.change(screen.getByLabelText(/Planning date and time/), {
            target: { value: '' },
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Create room' })
        );
        // the browser's own required-field check stops the submit
        expect(screen.getByLabelText(/Planning date and time/)).toBeInvalid();
        expect(createRoom).not.toHaveBeenCalled();
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
