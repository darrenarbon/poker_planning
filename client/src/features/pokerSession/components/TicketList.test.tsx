import { createEvent, fireEvent, screen } from '@testing-library/react';
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

    it('lets admins add a ticket with the inline form', async () => {
        const { session } = renderWithSession(<TicketList />, {
            isAdmin: true,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add New Ticket' })
        );
        await userEvent.type(
            screen.getByLabelText('New ticket number'),
            ' ABC-3 {Enter}'
        );
        expect(session.addTicket).toHaveBeenCalledWith('ABC-3');
        expect(
            screen.queryByLabelText('New ticket number')
        ).not.toBeInTheDocument();
    });

    it('does nothing when adding is cancelled', async () => {
        const { session } = renderWithSession(<TicketList />, {
            isAdmin: true,
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Add New Ticket' })
        );
        await userEvent.type(
            screen.getByLabelText('New ticket number'),
            'ABC-3{Escape}'
        );
        expect(session.addTicket).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Add New Ticket' })
        ).toBeInTheDocument();
    });

    it('selects a ticket from the keyboard', async () => {
        const { session } = renderWithSession(<TicketList />, { tickets });
        await userEvent.tab();
        await userEvent.keyboard('{Enter}');
        expect(session.selectTicket).toHaveBeenCalledWith(tickets[0]);
        await userEvent.keyboard(' ');
        expect(session.selectTicket).toHaveBeenCalledTimes(2);
    });

    describe('reordering', () => {
        const three = [
            ...tickets,
            makeTicket({ ticket_id: 'c', ticket_number: 'ABC-3' }),
        ];

        // jsdom has no layout, so give each item a 40px tall box
        const layOut = (items: HTMLElement[]) =>
            items.forEach((item, i) =>
                vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
                    top: i * 40,
                    height: 40,
                } as DOMRect)
            );

        it('lets a facilitator drag a ticket below another', () => {
            const moveTicket = vi.fn();
            renderWithSession(<TicketList />, {
                tickets: three,
                isAdmin: true,
                moveTicket,
            });
            const items = screen.getAllByTestId('ticket-drag-item');
            layOut(items);
            const dataTransfer = { setData: vi.fn() };

            fireEvent.dragStart(items[0], { dataTransfer });
            // lower half of the second ticket: the gap after it
            // jsdom drops clientY from drag events, so set it by hand
            const dragOver = createEvent.dragOver(items[1], { dataTransfer });
            Object.defineProperty(dragOver, 'clientY', { value: 70 });
            fireEvent(items[1], dragOver);
            expect(items[2]).toHaveClass('drop-before');
            fireEvent.drop(items[1], { dataTransfer });

            expect(moveTicket).toHaveBeenCalledWith('a', 2);
            expect(items[2]).not.toHaveClass('drop-before');
        });

        it('lets a facilitator move a ticket with Alt + arrow keys', async () => {
            const moveTicket = vi.fn();
            renderWithSession(<TicketList />, {
                tickets: three,
                isAdmin: true,
                moveTicket,
            });
            const card = screen.getByText('ABC-2').closest('.card')!;
            (card as HTMLElement).focus();

            await userEvent.keyboard('{Alt>}{ArrowUp}{/Alt}');
            expect(moveTicket).toHaveBeenLastCalledWith('b', 0);
            await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
            expect(moveTicket).toHaveBeenLastCalledWith('b', 3);
        });

        it('does not let players reorder', () => {
            renderWithSession(<TicketList />, { tickets: three });
            expect(screen.queryAllByTestId('ticket-drag-item')).toHaveLength(0);
            expect(
                screen.queryByText(/drag tickets to reorder/i)
            ).not.toBeInTheDocument();
        });
    });
});
