import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeTicket, makeUserModel } from '../../../test/factories';
import { renderWithSession } from '../../../test/renderWithSession';
import VotingPanel from './VotingPanel';

describe('VotingPanel', () => {
    it('renders nothing without a current ticket', () => {
        const { container } = renderWithSession(<VotingPanel />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the ticket and Jira preview button', () => {
        renderWithSession(<VotingPanel />, {
            currentTicket: makeTicket(),
            users: [makeUserModel()],
        });
        expect(screen.getByText('Voting on ticket')).toBeInTheDocument();
        expect(screen.getByText('ABC-1')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Open Jira Ticket Preview' })
        ).toHaveAttribute('data-bs-target', '#jiraTicketModal');
    });

    it("highlights the user's current vote", () => {
        renderWithSession(<VotingPanel />, {
            currentTicket: makeTicket({
                votes: [{ usersub: 'user-1', vote: 8 }],
            }),
        });
        expect(screen.getByRole('button', { name: '8' })).toHaveClass(
            'btn-primary'
        );
    });

    it('removes the vote buttons in refinement mode', () => {
        renderWithSession(<VotingPanel />, {
            currentTicket: makeTicket(),
            refinementMode: true,
        });
        expect(
            screen.queryByRole('button', { name: '8' })
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(/voting is turned off for you/)
        ).toBeInTheDocument();
    });

    it('submits the chosen vote', async () => {
        const { session } = renderWithSession(<VotingPanel />, {
            currentTicket: makeTicket(),
        });
        await userEvent.click(screen.getByRole('button', { name: '13' }));
        expect(session.submitVote).toHaveBeenCalledWith(13);
    });
});
