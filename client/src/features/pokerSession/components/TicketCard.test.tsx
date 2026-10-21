import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { TicketForVoting } from '../../../types';
import TicketCard from './TicketCard';

const renderCard = (
    ticket: TicketForVoting,
    props: Partial<Parameters<typeof TicketCard>[0]> = {}
) => {
    const onSelect = vi.fn();
    const utils = render(
        <TicketCard
            ticket={ticket}
            isSelected={false}
            onSelect={onSelect}
            userSub="me"
            ticketBaseUrl="https://jira.example.com/browse"
            {...props}
        />
    );
    return { ...utils, onSelect };
};

describe('TicketCard', () => {
    it.each([
        [makeTicket(), 'Not voted yet'],
        [makeTicket({ votes: [{ usersub: 'me', vote: 5 }] }), 'Voted: 5'],
        [makeTicket({ votes: [{ usersub: 'me', vote: 0 }] }), 'Voted: No Idea'],
        [
            makeTicket({
                votes: [{ usersub: 'me', vote: 5 }],
                chosen_estimate: 8,
            }),
            'Estimated: 8',
        ],
        [
            makeTicket({ votes: [{ usersub: 'other', vote: 5 }] }),
            'Not voted yet',
        ],
    ])('shows the status %#', (ticket, status) => {
        renderCard(ticket);
        expect(screen.getByText(status)).toBeInTheDocument();
    });

    it('selects the ticket when clicked', async () => {
        const ticket = makeTicket();
        const { onSelect } = renderCard(ticket);
        await userEvent.click(screen.getByText('ABC-1'));
        expect(onSelect).toHaveBeenCalledWith(ticket);
    });

    it('highlights the selected ticket', () => {
        const { container } = renderCard(makeTicket(), { isSelected: true });
        expect(container.firstChild).toHaveClass('bg-success-subtle');
    });

    it('links to the ticket in a new tab without selecting it', async () => {
        const { onSelect } = renderCard(makeTicket());
        const link = screen.getByRole('link', { name: 'View Ticket' });
        expect(link).toHaveAttribute(
            'href',
            'https://jira.example.com/browse/ABC-1'
        );
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');

        link.addEventListener('click', (e) => e.preventDefault());
        await userEvent.click(link);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
