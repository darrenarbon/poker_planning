import { VotingValue, votingValues } from '../constants';
import {
    SuggestedVote,
    SuggestedVoteRule,
    TicketForVoting,
    VoteModel,
} from '../types';

const countFrequencies = (nums: number[]): Map<number, number> => {
    const freq = new Map<number, number>();
    nums.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1));
    return freq;
};

export const calculateMode = (
    votes: VoteModel[],
): number | number[] | undefined => {
    if (votes.length === 0) return undefined;

    const freq = countFrequencies(votes.map((v) => v.vote));
    const max = Math.max(...freq.values());
    const modes = [...freq.entries()]
        .filter(([, count]) => count === max)
        .map(([value]) => value)
        .sort((a, b) => a - b);

    return modes.length === 1 ? modes[0] : modes;
};

export const toFib = (
    x: number,
    how: 'nearest' | 'ceil' = 'nearest',
    fibs: readonly VotingValue[] = votingValues,
): number => {
    if (fibs.length === 0) throw new Error('scale is empty');

    if (how === 'ceil') {
        return (
            fibs.find((card) => card.value >= x)?.value ??
            fibs[fibs.length - 1].value
        );
    }

    return fibs.reduce(
        (best, card) =>
            Math.abs(card.value - x) < Math.abs(best.value - x) ? card : best,
        fibs[0],
    ).value;
};

export const suggestVote = (votes: VoteModel[]): SuggestedVote => {
    if (!votes.length) throw new Error('no votes');

    const nums = votes.map((v) => v.vote);
    const [mode, maxFreq] = [...countFrequencies(nums).entries()].sort(
        (a, b) => b[1] - a[1],
    )[0];

    // strong majority: go with the mode
    if (maxFreq / nums.length >= 0.5)
        return { vote: mode, rule: SuggestedVoteRule.rule1 };

    const mean = nums.reduce((a, b) => a + b) / nums.length;
    const sd = Math.sqrt(
        nums.reduce((s, x) => s + (x - mean) ** 2, 0) / nums.length,
    );
    const cv = sd / mean;

    // tightly clustered: nearest card to the mean
    if (cv <= 0.25)
        return { vote: toFib(mean, 'nearest'), rule: SuggestedVoteRule.rule2 };
    // high uncertainty: round up, as erring high absorbs the risk
    return { vote: toFib(mean, 'ceil'), rule: SuggestedVoteRule.rule3 };
};

/** Returns a copy of the ticket with average, deviation, mode and suggestion filled in */
export const withVoteStats = (ticket: TicketForVoting): TicketForVoting => {
    const sum = ticket.votes.reduce((acc, v) => acc + v.vote, 0);
    const totalVotes = ticket.votes.filter((v) => v.vote > 0).length;
    const average_vote = parseFloat((sum / totalVotes).toFixed(2));

    const standard_deviation =
        totalVotes <= 1
            ? 0
            : parseFloat(
                  Math.sqrt(
                      ticket.votes.reduce(
                          (acc, v) => acc + (v.vote - (average_vote || 0)) ** 2,
                          0,
                      ) / totalVotes,
                  ).toFixed(2),
              );

    return {
        ...ticket,
        average_vote,
        standard_deviation,
        mode: calculateMode(ticket.votes),
        suggested_vote: suggestVote(ticket.votes),
    };
};
