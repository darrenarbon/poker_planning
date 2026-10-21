import { render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PokerSessionPage from './PokerSessionPage';

vi.mock('react-router-dom', () => ({
    useParams: () => ({ roomName: 'room-abc' }),
}));
vi.mock('../../components/NavBar', () => ({ default: () => <nav>nav</nav> }));
vi.mock('../../context', () => ({
    PokerSessionProvider: ({
        roomName,
        children,
    }: {
        roomName: string;
        children: ReactNode;
    }) => (
        <div data-testid="provider" data-room={roomName}>
            {children}
        </div>
    ),
}));
vi.mock('./components/SessionLayout', () => ({
    default: () => <div>layout</div>,
}));

describe('PokerSessionPage', () => {
    it('wraps the layout in a session for the room in the URL', () => {
        render(<PokerSessionPage />);
        expect(screen.getByText('nav')).toBeInTheDocument();
        const provider = screen.getByTestId('provider');
        expect(provider).toHaveAttribute('data-room', 'room-abc');
        expect(provider).toHaveTextContent('layout');
    });
});
