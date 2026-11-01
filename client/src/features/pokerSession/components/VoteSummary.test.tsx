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

const statValue = (label: string) =>
    screen
        .getByText(label)
        .closest('.vote-stat')
        ?.querySelector('.vote-stat-value')?.textContent;

describe('VoteSummary', () => {
    it('renders nothing before stats are calculated', () => {
        const { container } = render(<VoteSummary ticket={makeTicket()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the suggestion, its reason and the stats', () => {
        render(<VoteSummary ticket={statsTicket} />);
        expect(statValue('Suggested vote')).toBe('5');
        expect(screen.getByText(SuggestedVoteRule.rule1)).toBeInTheDocument();
        expect(statValue('Most common vote')).toBe('5');
        expect(statValue('Average vote')).toBe('6 ± 1.41');
    });

    it('lists every tied mode', () => {
        render(<VoteSummary ticket={{ ...statsTicket, mode: [3, 5] }} />);
        expect(statValue('Most common vote')).toBe('3, 5');
    });

    it('still renders when the average is 0', () => {
        render(<VoteSummary ticket={{ ...statsTicket, average_vote: 0 }} />);
        expect(statValue('Average vote')).toMatch(/^0 ±/);
    });
});
