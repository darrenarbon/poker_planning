import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import AdminPanel from './AdminPanel';

describe('AdminPanel', () => {
    it('renders nothing without a current ticket', () => {
        const { container } = renderWithSession(<AdminPanel />);
        expect(container).toBeEmptyDOMElement();
    });

    it('reveals votes', async () => {
        const { session } = renderWithSession(<AdminPanel />, {
            currentTicket: makeTicket(),
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Show Votes' })
        );
        expect(session.revealVotes).toHaveBeenCalled();
    });

    it('deletes the current ticket', async () => {
        const { session } = renderWithSession(<AdminPanel />, {
            currentTicket: makeTicket(),
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete Ticket' })
        );
        expect(session.deleteCurrentTicket).toHaveBeenCalled();
    });

    it('moves everyone to the next ticket', async () => {
        const ticket = makeTicket();
        const { session } = renderWithSession(<AdminPanel />, {
            currentTicket: ticket,
            tickets: [ticket, makeTicket({ ticket_id: 't2' })],
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Next ticket' })
        );
        expect(session.nextTicket).toHaveBeenCalled();
    });

    it('clears the votes for a re-vote after confirming', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { session } = renderWithSession(<AdminPanel />, {
            currentTicket: makeTicket({
                votes: [{ usersub: 'user-1', vote: 3 }],
            }),
        });
        await userEvent.click(screen.getByRole('button', { name: 'Re-vote' }));
        expect(session.revote).toHaveBeenCalled();
    });

    it('cannot re-vote before anyone has voted', () => {
        renderWithSession(<AdminPanel />, { currentTicket: makeTicket() });
        expect(screen.getByRole('button', { name: 'Re-vote' })).toBeDisabled();
    });

    it('hides Delete Ticket in refinement mode', () => {
        renderWithSession(<AdminPanel />, {
            currentTicket: makeTicket(),
            refinementMode: true,
        });
        expect(
            screen.queryByRole('button', { name: 'Delete Ticket' })
        ).not.toBeInTheDocument();
    });
});
