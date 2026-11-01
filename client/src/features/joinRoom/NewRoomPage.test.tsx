import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NewRoomPage from './NewRoomPage';

vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('./components/CreateRoomForm', () => ({
    default: () => <div>create-room</div>,
}));

describe('NewRoomPage', () => {
    it('shows the create form with a way back', () => {
        render(<NewRoomPage />);
        expect(screen.getByText('create-room')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: /Back to rooms/ })
        ).toHaveAttribute('href', '/');
    });
});
