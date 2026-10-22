import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import PastSprints from './PastSprints';

describe('PastSprints', () => {
    it('renders nothing without archived tickets', () => {
        const { container } = renderWithSession(<PastSprints />);
        expect(container).toBeEmptyDOMElement();
    });

    it('lists archived tickets grouped by sprint when opened', () => {
        renderWithSession(<PastSprints />, {
            archivedTickets: [
                makeTicket({
                    ticket_id: 'old',
                    ticket_number: 'OLD-1',
                    archived_at: '2026-09-01T10:00:00Z',
                }),
                makeTicket({
                    ticket_id: 'new',
                    ticket_number: 'NEW-1',
                    archived_at: '2026-10-01T10:00:00Z',
                }),
            ],
        });
        const toggle = screen.getByRole('button', {
            name: /Past sprints \(2\)/,
        });
        expect(screen.queryByText('OLD-1')).not.toBeInTheDocument();
        fireEvent.click(toggle);
        const links = screen.getAllByRole('link');
        expect(links.map((l) => l.textContent)).toEqual(['NEW-1', 'OLD-1']);
    });
});
