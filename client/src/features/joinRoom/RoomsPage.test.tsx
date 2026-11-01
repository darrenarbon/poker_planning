import { useAuth0 } from '@auth0/auth0-react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserRooms } from '../../hooks';
import { makeAuthUser } from '../../test/factories';
import RoomsPage from './RoomsPage';

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }));
vi.mock('../../hooks', () => ({ useUserRooms: vi.fn() }));
vi.mock('../../components/NavBar', () => ({ default: () => <nav /> }));
vi.mock('./components/LoggedOutWelcome', () => ({
    default: () => <div>logged-out-welcome</div>,
}));
vi.mock('./components/RoomLists', () => ({
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
        toggleFavourite: vi.fn(),
        ...value,
    });

describe('RoomsPage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('asks logged-out users to log in', () => {
        mockAuth(false);
        mockRooms({ loaded: false });
        render(<RoomsPage />);
        expect(screen.getByText('logged-out-welcome')).toBeInTheDocument();
    });

    it('shows the loader while auth is restoring the session', () => {
        vi.mocked(useAuth0).mockReturnValue({
            isAuthenticated: false,
            isLoading: true,
        } as unknown as ReturnType<typeof useAuth0>);
        mockRooms({ loaded: false });
        const { container } = render(<RoomsPage />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
    });

    it('shows the loader until rooms are loaded', () => {
        mockAuth(true);
        mockRooms({ loaded: false });
        const { container } = render(<RoomsPage />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
    });

    it('lists rooms with a link to create one, but no forms', () => {
        mockAuth(true);
        mockRooms({ rooms: [{} as never, {} as never] });
        render(<RoomsPage />);
        expect(screen.getByText('my-rooms:2')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'New room' })).toHaveAttribute(
            'href',
            '/rooms/new'
        );
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows an error when rooms fail to load', () => {
        mockAuth(true);
        mockRooms({ error: 'Could not load your rooms.' });
        render(<RoomsPage />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load your rooms.'
        );
    });
});
