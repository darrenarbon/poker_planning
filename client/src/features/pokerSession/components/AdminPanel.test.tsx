import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
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

    it('sets the final estimate and highlights the chosen one', async () => {
        const { session } = renderWithSession(<AdminPanel />, {
            currentTicket: makeTicket({ chosen_estimate: 3 }),
        });
        expect(screen.getByRole('button', { name: '3' })).toHaveClass(
            'btn-primary'
        );
        await userEvent.click(screen.getByRole('button', { name: '5' }));
        expect(session.setEstimate).toHaveBeenCalledWith(5);
    });
});
