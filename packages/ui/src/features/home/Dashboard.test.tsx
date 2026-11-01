import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserRooms } from '../../apps/planningPoker/hooks';
import { makeRoomSummary } from '../../test/factories';
import Dashboard from './Dashboard';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../apps/planningPoker/hooks', () => ({ useUserRooms: vi.fn() }));
vi.mock('../../hooks', () => ({
    useMyTeams: () => ({
        teams: [{ team_id: 4, name: 'Platform' }],
        loaded: true,
    }),
}));

const mockRooms = (value: Partial<ReturnType<typeof useUserRooms>>) =>
    vi.mocked(useUserRooms).mockReturnValue({
        rooms: [],
        loaded: true,
        error: null,
        toggleFavourite: vi.fn(),
        ...value,
    });

describe('Dashboard', () => {
    beforeEach(() => vi.clearAllMocks());

    it('greets the user and links to the new room page', () => {
        mockRooms({});
        render(<Dashboard givenName="Ada" />);
        expect(
            screen.getByRole('heading', { name: 'Welcome back, Ada' })
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'New room' })).toHaveAttribute(
            'href',
            '/poker/rooms/new'
        );
        expect(screen.getByText(/Nothing is planned/)).toBeInTheDocument();
    });

    it('has no room form and does not advertise the apps', () => {
        mockRooms({});
        render(<Dashboard />);
        expect(screen.queryByLabelText(/Room Name/)).not.toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Your apps' })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: /Skills Matrix/ })
        ).not.toBeInTheDocument();
    });

    it('lists upcoming sessions with their team', () => {
        const soon = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
        mockRooms({
            rooms: [
                makeRoomSummary({
                    friendly_name: 'Sprint planning',
                    team_id: 4,
                    scheduled_at: soon,
                }),
            ],
        });
        render(<Dashboard />);
        expect(
            screen.getByRole('link', { name: /Sprint planning/ })
        ).toHaveTextContent('Platform');
    });

    it('shows the loader until rooms are in', () => {
        mockRooms({ loaded: false });
        const { container } = render(<Dashboard />);
        expect(container.querySelector('.loader')).toBeInTheDocument();
        expect(
            screen.queryByText(/Nothing is planned/)
        ).not.toBeInTheDocument();
    });

    it('shows an error when rooms could not be loaded', () => {
        mockRooms({ error: 'Could not load your rooms.' });
        render(<Dashboard />);
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load your rooms.'
        );
    });
});
