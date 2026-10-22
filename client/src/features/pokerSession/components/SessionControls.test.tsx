import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeRoom } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import SessionControls from './SessionControls';

describe('SessionControls', () => {
    it('renders nothing for players', () => {
        const { container } = renderWithSession(<SessionControls />);
        expect(container).toBeEmptyDOMElement();
    });

    it('is available before any ticket is selected', () => {
        renderWithSession(<SessionControls />, { isAdmin: true });
        expect(
            screen.getByRole('button', { name: 'End session and hide room' })
        ).toBeInTheDocument();
    });

    it('toggles refinement mode for the session', async () => {
        const { session } = renderWithSession(<SessionControls />, {
            isAdmin: true,
        });
        const toggle = screen.getByRole('button', {
            name: 'Refinement mode: Off',
        });
        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await userEvent.click(toggle);
        expect(session.toggleRefinementMode).toHaveBeenCalled();
    });

    it('shows when refinement mode is on', () => {
        renderWithSession(<SessionControls />, {
            isAdmin: true,
            refinementMode: true,
        });
        expect(
            screen.getByRole('button', { name: 'Refinement mode: On' })
        ).toHaveAttribute('aria-pressed', 'true');
    });

    it('finishes and hides the room after confirming', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { session } = renderWithSession(<SessionControls />, {
            isAdmin: true,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'End session and hide room' })
        );
        expect(session.setRoomHidden).toHaveBeenCalledWith(true);
    });

    it('does not hide the room if cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const { session } = renderWithSession(<SessionControls />, {
            isAdmin: true,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'End session and hide room' })
        );
        expect(session.setRoomHidden).not.toHaveBeenCalled();
    });

    it('unhides a hidden room', async () => {
        const { session } = renderWithSession(<SessionControls />, {
            isAdmin: true,
            room: makeRoom({ hidden: true }),
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Unhide room' })
        );
        expect(session.setRoomHidden).toHaveBeenCalledWith(false);
    });
});
