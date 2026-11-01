import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import CurrentTicketPanel from './CurrentTicketPanel';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('./VotingPanel', () => ({ default: () => <div>voting-panel</div> }));
vi.mock('./VotingComplete', () => ({
    default: () => <div>voting-complete</div>,
}));
vi.mock('./VoteSummary', () => ({ default: () => <div>vote-summary</div> }));
vi.mock('./PlayersPanel', () => ({ default: () => <div>players-panel</div> }));
vi.mock('./SessionStats', () => ({ default: () => <div>session-stats</div> }));
vi.mock('./AdminPanel', () => ({ default: () => <div>admin-panel</div> }));

describe('CurrentTicketPanel', () => {
    it('prompts to select a ticket when none is selected', () => {
        renderWithSession(<CurrentTicketPanel />);
        expect(
            screen.getByText('Select a ticket to start voting')
        ).toBeInTheDocument();
    });

    it('shows the voting panel for an unestimated ticket', () => {
        renderWithSession(<CurrentTicketPanel />, {
            currentTicket: makeTicket(),
        });
        expect(screen.getByText('voting-panel')).toBeInTheDocument();
        expect(screen.queryByText('vote-summary')).not.toBeInTheDocument();
        expect(screen.queryByText('admin-panel')).not.toBeInTheDocument();
    });

    it('shows voting complete to players once estimated', () => {
        renderWithSession(<CurrentTicketPanel />, {
            currentTicket: makeTicket({ chosen_estimate: 5 }),
        });
        expect(screen.getByText('voting-complete')).toBeInTheDocument();
        expect(screen.queryByText('voting-panel')).not.toBeInTheDocument();
    });

    it('keeps admins on the voting panel with admin controls', () => {
        renderWithSession(<CurrentTicketPanel />, {
            currentTicket: makeTicket({ chosen_estimate: 5 }),
            isAdmin: true,
        });
        expect(screen.getByText('voting-panel')).toBeInTheDocument();
        expect(screen.getByText('admin-panel')).toBeInTheDocument();
    });

    it('shows the vote summary once votes are revealed', () => {
        renderWithSession(<CurrentTicketPanel />, {
            currentTicket: makeTicket(),
            showVotes: true,
        });
        expect(screen.getByText('vote-summary')).toBeInTheDocument();
    });

    it('shows sprint stats while they are open', () => {
        renderWithSession(<CurrentTicketPanel />, {
            currentTicket: makeTicket(),
            statsOpen: true,
        });
        expect(screen.getByText('session-stats')).toBeInTheDocument();
    });

    it('hides sprint stats once closed', () => {
        renderWithSession(<CurrentTicketPanel />, {
            currentTicket: makeTicket(),
        });
        expect(screen.queryByText('session-stats')).not.toBeInTheDocument();
    });
});
