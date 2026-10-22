import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import TicketList from './TicketList';

const tickets = [
    makeTicket({ ticket_id: 'a', ticket_number: 'ABC-1' }),
    makeTicket({ ticket_id: 'b', ticket_number: 'ABC-2' }),
];

describe('TicketList', () => {
    afterEach(() => vi.restoreAllMocks());

    it('renders a card per ticket and highlights the current one', () => {
        renderWithSession(<TicketList />, {
            tickets,
            currentTicket: tickets[1],
        });
        expect(screen.getByText('ABC-1').closest('.card')).not.toHaveClass(
            'selected'
        );
        expect(screen.getByText('ABC-2').closest('.card')).toHaveClass(
            'selected'
        );
    });

    it('counts the tickets I have voted on', () => {
        renderWithSession(<TicketList />, {
            tickets: [
                makeTicket({
                    ticket_id: 'a',
                    ticket_number: 'ABC-1',
                    votes: [{ usersub: 'user-1', vote: 5 }],
                }),
                makeTicket({
                    ticket_id: 'b',
                    ticket_number: 'ABC-2',
                    chosen_estimate: 8,
                }),
                makeTicket({ ticket_id: 'c', ticket_number: 'ABC-3' }),
            ],
        });
        expect(screen.getByText('1/3 voted')).toBeInTheDocument();
    });

    it('selects a ticket when its card is clicked', async () => {
        const { session } = renderWithSession(<TicketList />, { tickets });
        await userEvent.click(screen.getByText('ABC-2'));
        expect(session.selectTicket).toHaveBeenCalledWith(tickets[1]);
    });

    it('hides Add New Ticket from non-admins', () => {
        renderWithSession(<TicketList />, { tickets });
        expect(
            screen.queryByRole('button', { name: 'Add New Ticket' })
        ).not.toBeInTheDocument();
    });

    it('lets admins add a ticket via a prompt', async () => {
        vi.spyOn(window, 'prompt').mockReturnValue('ABC-3');
        const { session } = renderWithSession(<TicketList />, {
            isAdmin: true,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add New Ticket' })
        );
        expect(session.addTicket).toHaveBeenCalledWith('ABC-3');
    });

    it('does nothing when the prompt is cancelled', async () => {
        vi.spyOn(window, 'prompt').mockReturnValue(null);
        const { session } = renderWithSession(<TicketList />, {
            isAdmin: true,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add New Ticket' })
        );
        expect(session.addTicket).not.toHaveBeenCalled();
    });
});
