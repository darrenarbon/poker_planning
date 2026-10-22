import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeRoom } from '../../../test/factories';
import RoomHeader from './RoomHeader';

describe('RoomHeader', () => {
    it('shows the friendly name and room name', () => {
        render(<RoomHeader room={makeRoom()} />);
        expect(
            screen.getByRole('heading', { name: 'Sprint Planning' })
        ).toBeInTheDocument();
        expect(screen.getByText('room-abc')).toBeInTheDocument();
    });

    it('copies an invite link to the room', async () => {
        const user = userEvent.setup();
        render(<RoomHeader room={makeRoom()} />);
        await user.click(
            screen.getByRole('button', { name: 'Copy invite link' })
        );
        await expect(navigator.clipboard.readText()).resolves.toBe(
            `${window.location.origin}/room/room-abc/voting`
        );
        expect(
            screen.getByRole('button', { name: 'Link copied!' })
        ).toBeInTheDocument();
    });

    it('toggles the room as a favourite', async () => {
        const onToggleFavourite = vi.fn();
        render(
            <RoomHeader
                room={makeRoom({ favourite: true })}
                onToggleFavourite={onToggleFavourite}
            />
        );
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Remove Sprint Planning from favourites',
            })
        );
        expect(onToggleFavourite).toHaveBeenCalled();
    });

    it('explains when the room is hidden', () => {
        render(<RoomHeader room={makeRoom({ hidden: true })} />);
        expect(screen.getByText(/finished and hidden/)).toBeInTheDocument();
    });
});
