import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JoinExistingRoom from './JoinExistingRoom';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

describe('JoinExistingRoom', () => {
    beforeEach(() => navigate.mockClear());

    it('disables Join until a room ID is entered', async () => {
        render(<JoinExistingRoom />);
        const join = screen.getByRole('button', { name: 'Join room' });
        expect(join).toBeDisabled();

        await userEvent.type(screen.getByLabelText(/Room ID/), '   ');
        expect(join).toBeDisabled();
    });

    it('navigates to the trimmed room', async () => {
        render(<JoinExistingRoom />);
        await userEvent.type(screen.getByLabelText(/Room ID/), '  room-abc ');
        await userEvent.click(
            screen.getByRole('button', { name: 'Join room' })
        );
        expect(navigate).toHaveBeenCalledWith('/room/room-abc/voting');
    });
});
