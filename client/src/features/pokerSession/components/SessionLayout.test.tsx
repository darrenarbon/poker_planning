import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithSession } from '../../../test/renderWithSession';
import SessionLayout from './SessionLayout';

vi.mock('./TicketList', () => ({ default: () => <div>ticket-list</div> }));
vi.mock('./CurrentTicketPanel', () => ({
    default: () => <div>current-ticket</div>,
}));

describe('SessionLayout', () => {
    it('shows the loader while the room is loading', () => {
        const { container } = renderWithSession(<SessionLayout />, {
            room: undefined,
        });
        expect(container.querySelector('.loader')).toBeInTheDocument();
    });

    it('shows the load error instead of the loader', () => {
        const { container } = renderWithSession(<SessionLayout />, {
            room: undefined,
            loadError: 'Could not load room "room-abc".',
        });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not load room'
        );
        expect(container.querySelector('.loader')).not.toBeInTheDocument();
    });

    it('renders the room header, ticket list and current ticket', () => {
        renderWithSession(<SessionLayout />);
        expect(screen.getByText('Sprint Planning (room-abc)')).toBeVisible();
        expect(screen.getByText('ticket-list')).toBeInTheDocument();
        expect(screen.getByText('current-ticket')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows a dismissible session error', async () => {
        const { session } = renderWithSession(<SessionLayout />, {
            error: 'Could not add ticket ABC-9.',
        });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not add ticket ABC-9.'
        );
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
        expect(session.dismissError).toHaveBeenCalled();
    });
});
