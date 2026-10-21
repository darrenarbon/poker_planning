import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { SuggestedVoteRule } from '../../../types';
import VotingComplete from './VotingComplete';

describe('VotingComplete', () => {
    it('shows the ticket and final estimate', () => {
        render(<VotingComplete ticket={makeTicket({ chosen_estimate: 8 })} />);
        expect(
            screen.getByText('Voting on ticket: ABC-1 is complete')
        ).toBeInTheDocument();
        expect(screen.getByText('Final Estimate: 8')).toBeInTheDocument();
    });

    it('includes the vote summary when stats are available', () => {
        render(
            <VotingComplete
                ticket={makeTicket({
                    chosen_estimate: 8,
                    average_vote: 7,
                    suggested_vote: { vote: 8, rule: SuggestedVoteRule.rule3 },
                })}
            />
        );
        expect(screen.getByText('Suggested Vote: 8')).toBeInTheDocument();
    });
});
