import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTicket } from '../../../test/factories';
import { SuggestedVoteRule } from '../../../types';
import VoteSummary from './VoteSummary';

const statsTicket = makeTicket({
    average_vote: 6,
    standard_deviation: 1.41,
    mode: 5,
    suggested_vote: { vote: 5, rule: SuggestedVoteRule.rule1 },
});

describe('VoteSummary', () => {
    it('renders nothing before stats are calculated', () => {
        const { container } = render(<VoteSummary ticket={makeTicket()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the suggestion, its reason and the stats', () => {
        render(<VoteSummary ticket={statsTicket} />);
        expect(screen.getByText('Suggested Vote: 5')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent(
            SuggestedVoteRule.rule1
        );
        expect(screen.getByText(/Most Common Vote: 5/)).toBeInTheDocument();
        expect(screen.getByText(/Average Vote: 6 ± 1.41/)).toBeInTheDocument();
    });

    it('lists every tied mode', () => {
        render(<VoteSummary ticket={{ ...statsTicket, mode: [3, 5] }} />);
        expect(screen.getByText(/Most Common Vote: 3, 5/)).toBeInTheDocument();
    });

    it('still renders when the average is 0', () => {
        render(<VoteSummary ticket={{ ...statsTicket, average_vote: 0 }} />);
        expect(screen.getByText(/Average Vote: 0/)).toBeInTheDocument();
    });
});
