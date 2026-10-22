import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeRoomSummary } from '../../../test/factories';
import MyRoomsList from './MyRoomsList';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

describe('MyRoomsList', () => {
    it('lists each room with its name and creation date', () => {
        render(
            <MyRoomsList
                rooms={[
                    makeRoomSummary(),
                    makeRoomSummary({
                        room_id: 2,
                        room_name: 'room-xyz',
                        friendly_name: 'Retro',
                    }),
                ]}
            />
        );
        expect(
            screen.getByText(/Sprint Planning \(room-abc\) created on 5 Mar 26/)
        ).toBeInTheDocument();
        expect(screen.getByText(/Retro \(room-xyz\)/)).toBeInTheDocument();
    });

    it('navigates to the room when clicked', async () => {
        render(<MyRoomsList rooms={[makeRoomSummary()]} />);
        await userEvent.click(screen.getByText(/Sprint Planning/));
        expect(navigate).toHaveBeenCalledWith('/room/room-abc/voting');
    });
});
