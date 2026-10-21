import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserRooms } from '../../hooks';
import { makeAuthUser } from '../../test/factories';
import JoinRoomPage from './JoinRoomPage';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('../../hooks', () => ({ useUserRooms: vi.fn() }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('./components/JoinExistingRoom', () => ({
    default: () => <div>join-existing</div>,
}));
vi.mock('./components/CreateRoomForm', () => ({
    default: () => <div>create-room</div>,
}));
vi.mock('./components/MyRoomsList', () => ({
    default: ({ rooms }: { rooms: unknown[] }) => (
        <div>my-rooms:{rooms.length}</div>
    ),
}));

const mockAuth = (isAuthenticated: boolean) =>
    vi.mocked(useAuth0).mockReturnValue({
        isAuthenticated,
        user: isAuthenticated ? makeAuthUser() : undefined,
    } as unknown as ReturnType<typeof useAuth0>);

const mockRooms = (value: Partial<ReturnType<typeof useUserRooms>>) =>
    vi.mocked(useUserRooms).mockReturnValue({
        rooms: [],
        loaded: true,
        error: null,
        ...value,
    });

describe('JoinRoomPage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('asks logged-out users to log in', () => {
        mockAuth(false);
        mockRooms({ loaded: false });
        render(<JoinRoomPage />);
        expect(
            screen.getByText('Please log in to create or join a room')
        ).toBeInTheDocument();
    });

    it('shows the loader until rooms are loaded', () => {
        mockAuth(true);
        mockRooms({ loaded: false });
        const { container } = render(<JoinRoomPage />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
    });

    it('shows join, create and my rooms once loaded', () => {
        mockAuth(true);
        mockRooms({ rooms: [{} as never, {} as never] });
        render(<JoinRoomPage />);
        expect(screen.getByText('join-existing')).toBeInTheDocument();
        expect(screen.getByText('create-room')).toBeInTheDocument();
        expect(screen.getByText('my-rooms:2')).toBeInTheDocument();
    });

    it('shows an error when rooms fail to load', () => {
        mockAuth(true);
        mockRooms({ error: 'Could not load your rooms.' });
        render(<JoinRoomPage />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load your rooms.'
        );
    });
});
