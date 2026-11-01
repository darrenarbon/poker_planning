import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeRoomSummary } from '../../test/factories';
import UpcomingSessions from './UpcomingSessions';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const now = new Date(2030, 4, 1, 12, 0);
const at = (days: number, hour: number) =>
    new Date(2030, 4, 1 + days, hour).toISOString();

describe('UpcomingSessions', () => {
    it('explains when nothing is planned', () => {
        render(<UpcomingSessions rooms={[]} now={now} />);
        expect(screen.getByText(/Nothing is planned/)).toBeInTheDocument();
    });

    it('lists sessions under their day with the time and name', () => {
        render(
            <UpcomingSessions
                now={now}
                rooms={[
                    makeRoomSummary({
                        room_id: 1,
                        friendly_name: 'Afternoon refinement',
                        scheduled_at: at(0, 15),
                    }),
                    makeRoomSummary({
                        room_id: 2,
                        friendly_name: 'Tomorrow planning',
                        scheduled_at: at(1, 9),
                    }),
                ]}
            />
        );
        expect(
            screen.getByRole('heading', { name: 'Today' })
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Tomorrow' })
        ).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /Afternoon refinement/ });
        expect(link).toHaveTextContent('15:00');
        expect(link).toHaveAttribute('href', '/poker/room/room-abc/voting');
    });

    it('opens a room without a page reload', async () => {
        render(
            <UpcomingSessions
                now={now}
                rooms={[
                    makeRoomSummary({
                        room_name: 'go-here',
                        friendly_name: 'Planning',
                        scheduled_at: at(0, 15),
                    }),
                ]}
            />
        );
        await userEvent.click(screen.getByRole('link', { name: /Planning/ }));
        expect(navigate).toHaveBeenCalledWith('/poker/room/go-here/voting');
    });

    it('labels team rooms and sessions already under way', () => {
        render(
            <UpcomingSessions
                now={now}
                teamNames={{ 4: 'Platform' }}
                rooms={[
                    makeRoomSummary({
                        friendly_name: 'Running',
                        team_id: 4,
                        scheduled_at: at(0, 11),
                    }),
                ]}
            />
        );
        const link = screen.getByRole('link', { name: /Running/ });
        expect(within(link).getByText('Platform')).toBeInTheDocument();
        expect(within(link).getByText('Now')).toBeInTheDocument();
    });

    it('shows the first eight and says how many more', () => {
        const rooms = Array.from({ length: 10 }, (_, i) =>
            makeRoomSummary({
                room_id: i + 1,
                friendly_name: `Room ${i + 1}`,
                scheduled_at: at(0, 13 + (i % 8)),
            })
        );
        render(<UpcomingSessions now={now} rooms={rooms} />);
        expect(screen.getAllByRole('listitem')).toHaveLength(8);
        expect(screen.getByText(/And 2 more/)).toBeInTheDocument();
    });
});
