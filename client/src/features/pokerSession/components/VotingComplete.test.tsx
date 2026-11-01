import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { SuggestedVoteRule } from '../../../types';
import VotingComplete from './VotingComplete';

describe('VotingComplete', () => {
    it('shows the ticket and final estimate', () => {
        render(<VotingComplete ticket={makeTicket({ chosen_estimate: 8 })} />);
        expect(screen.getByText('Voting complete')).toBeInTheDocument();
        expect(screen.getByText('ABC-1')).toBeInTheDocument();
        expect(screen.getByText('8')).toHaveClass('final-estimate');
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
        expect(screen.getByText('Suggested vote')).toBeInTheDocument();
    });
});
