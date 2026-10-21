import { NO_IDEA_VOTE, VotingValue, votingValues } from '../constants';
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
    // most frequent value; on a tie, the highest estimate wins
    const [mode, maxFreq] = [...countFrequencies(nums).entries()].sort(
        (a, b) => b[1] - a[1] || b[0] - a[0],
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
/**
 * Returns a copy of the ticket with average, deviation, mode and suggestion
 * filled in. "No Idea" votes are excluded from every statistic, and the
 * statistics are left unset when there are no numeric votes.
 */
export const withVoteStats = (ticket: TicketForVoting): TicketForVoting => {
    const votes = ticket.votes.filter((v) => v.vote !== NO_IDEA_VOTE);
    if (votes.length === 0) {
        return {
            ...ticket,
            average_vote: undefined,
            standard_deviation: undefined,
            mode: undefined,
            suggested_vote: undefined,
        };
    }

    const mean = votes.reduce((acc, v) => acc + v.vote, 0) / votes.length;
    const variance =
        votes.reduce((acc, v) => acc + (v.vote - mean) ** 2, 0) / votes.length;

    return {
        ...ticket,
        average_vote: parseFloat(mean.toFixed(2)),
        standard_deviation: parseFloat(Math.sqrt(variance).toFixed(2)),
        mode: calculateMode(votes),
        suggested_vote: suggestVote(votes),
    };
};
