import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeRoom } from '../../../../../test/factories';
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
            `${window.location.origin}/poker/room/room-abc/voting`
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

    describe('planning date', () => {
        const scheduledAt = '2030-05-01T09:30:00.000Z';

        it('shows when the planning happens', () => {
            render(<RoomHeader room={makeRoom({ scheduledAt })} />);
            expect(screen.getByText(/Planning:/)).toBeInTheDocument();
            expect(
                screen.getByText(/Planning:/).querySelector('time')
            ).toHaveAttribute('datetime', scheduledAt);
        });

        it('does not offer to change it to people who cannot run the room', () => {
            render(<RoomHeader room={makeRoom({ scheduledAt })} />);
            expect(
                screen.queryByRole('button', { name: 'Change' })
            ).not.toBeInTheDocument();
        });

        it('lets a facilitator pick a new time and save it', async () => {
            const onChangeSchedule = vi.fn().mockResolvedValue(true);
            render(
                <RoomHeader
                    room={makeRoom({ scheduledAt })}
                    onChangeSchedule={onChangeSchedule}
                />
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Change' })
            );
            const input = screen.getByLabelText('Planning date and time');
            fireEvent.change(input, { target: { value: '2030-06-02T14:15' } });
            await userEvent.click(screen.getByRole('button', { name: 'Save' }));

            expect(onChangeSchedule).toHaveBeenCalledWith(
                new Date('2030-06-02T14:15').toISOString()
            );
            await waitFor(() =>
                expect(
                    screen.queryByLabelText('Planning date and time')
                ).not.toBeInTheDocument()
            );
        });

        it('keeps the editor open when saving fails', async () => {
            const onChangeSchedule = vi.fn().mockResolvedValue(false);
            render(
                <RoomHeader
                    room={makeRoom({ scheduledAt })}
                    onChangeSchedule={onChangeSchedule}
                />
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Change' })
            );
            await userEvent.click(screen.getByRole('button', { name: 'Save' }));
            expect(
                await screen.findByLabelText('Planning date and time')
            ).toBeInTheDocument();
        });

        it('cannot save an empty time, and cancel leaves it alone', async () => {
            const onChangeSchedule = vi.fn();
            render(
                <RoomHeader
                    room={makeRoom({ scheduledAt })}
                    onChangeSchedule={onChangeSchedule}
                />
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Change' })
            );
            fireEvent.change(screen.getByLabelText('Planning date and time'), {
                target: { value: '' },
            });
            expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
            await userEvent.click(
                screen.getByRole('button', { name: 'Cancel' })
            );
            expect(onChangeSchedule).not.toHaveBeenCalled();
            expect(
                screen.getByRole('button', { name: 'Change' })
            ).toBeInTheDocument();
        });

        it('offers to set a date on a room without one', () => {
            render(<RoomHeader room={makeRoom()} onChangeSchedule={vi.fn()} />);
            expect(
                screen.getByRole('button', { name: 'Set date' })
            ).toBeInTheDocument();
        });
    });
});
