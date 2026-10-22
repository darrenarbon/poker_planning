import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JoinRoomPage from './JoinRoomPage';

vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('./components/JoinExistingRoom', () => ({
    default: () => <div>join-existing</div>,
}));

describe('JoinRoomPage', () => {
    it('shows the join form with a way back', () => {
        render(<JoinRoomPage />);
        expect(screen.getByText('join-existing')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Back to rooms/ })
        ).toHaveAttribute('href', '/');
    });
});
