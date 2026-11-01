import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeRoomSummary } from '../../../test/factories';
import RoomLists from './RoomLists';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const rooms = [
    makeRoomSummary({ room_id: 1, friendly_name: 'Mine', is_admin: true }),
    makeRoomSummary({
        room_id: 2,
        room_name: 'room-fav',
        friendly_name: 'Starred',
        is_admin: false,
        favourite: true,
    }),
    makeRoomSummary({
        room_id: 3,
        friendly_name: 'Older join',
        is_admin: false,
        last_joined_at: '2026-04-01T00:00:00Z',
    }),
    makeRoomSummary({
        room_id: 4,
        friendly_name: 'Newer join',
        is_admin: false,
        last_joined_at: '2026-05-01T00:00:00Z',
    }),
    makeRoomSummary({
        room_id: 5,
        friendly_name: 'Finished',
        hidden: true,
        favourite: true,
    }),
];

const section = (title: string) =>
    screen.getByRole('heading', { name: title }).closest('section')!;

describe('RoomLists', () => {
    it('groups rooms into favourites, created and joined', () => {
        render(<RoomLists rooms={rooms} onToggleFavourite={vi.fn()} />);
        expect(
            within(section('Favourites')).getByText('Starred')
        ).toBeVisible();
        expect(within(section('My rooms')).getByText('Mine')).toBeVisible();
        const joined = within(section('Recently joined'))
            .getAllByRole('heading', { level: 3 })
            .map((h) => h.textContent);
        expect(joined).toEqual(['Newer join', 'Older join']);
    });

    it('keeps hidden rooms out of every list, even favourites, until asked', async () => {
        render(<RoomLists rooms={rooms} onToggleFavourite={vi.fn()} />);
        expect(screen.queryByText('Finished')).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Show hidden rooms (1)' })
        );
        expect(
            within(section('Hidden rooms')).getByText('Finished')
        ).toBeVisible();
    });

    it('toggles a favourite without opening the room', async () => {
        const onToggleFavourite = vi.fn();
        render(
            <RoomLists rooms={rooms} onToggleFavourite={onToggleFavourite} />
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Add Mine to favourites' })
        );
        expect(onToggleFavourite).toHaveBeenCalledWith(rooms[0]);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('opens a room when its card is clicked', async () => {
        render(<RoomLists rooms={rooms} onToggleFavourite={vi.fn()} />);
        await userEvent.click(screen.getByText('Mine'));
        expect(navigate).toHaveBeenCalledWith('/room/room-abc/voting');
    });

    it('shows an empty state when there are no rooms', () => {
        render(<RoomLists rooms={[]} onToggleFavourite={vi.fn()} />);
        expect(
            screen.getByText(/haven't created any rooms yet/)
        ).toBeInTheDocument();
    });

    it('treats rooms without an is_admin flag as created by the user', () => {
        render(
            <RoomLists
                rooms={[makeRoomSummary({ friendly_name: 'Legacy' })]}
                onToggleFavourite={vi.fn()}
            />
        );
        expect(within(section('My rooms')).getByText('Legacy')).toBeVisible();
    });
});
