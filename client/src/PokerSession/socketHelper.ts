import { VotingValue, votingValues } from '../Voting/votingHelper';
import {
    SuggestedVote,
    SuggestedVoteRule,
    TicketForVoting,
    VoteModel,
} from './types';

export const socket_voteReceived = (
    ticket: TicketForVoting,
    vote: number,
    userSub: string
) => {
    const voteForUser = ticket.votes.find((v) => v.usersub === userSub);

    if (voteForUser) {
        voteForUser.vote = vote;
    } else {
        ticket.votes.push({
            vote,
            usersub: userSub,
        });
    }
    return ticket;
};

const calculateMode = (votes: VoteModel[]): number | number[] | undefined => {
    if (votes.length === 0) return undefined;

    // 1)  Count each vote value -----------------------------------------------
    const freq = new Map<number, number>();
    for (const { vote } of votes) {
        freq.set(vote, (freq.get(vote) ?? 0) + 1);
    }

    // 2)  Find the maximum frequency ------------------------------------------
    let max = 0;
    for (const count of freq.values()) {
        if (count > max) max = count;
    }

    // 3)  Collect every value that hits that max -------------------------------
    const modes = [...freq.entries()]
        .filter(([, count]) => count === max)
        .map(([value]) => value)
        .sort((a, b) => a - b); // nice, predictable order for ties

    // 4)  Return single value or array -----------------------------------------
    return modes.length === 1 ? modes[0] : modes;
};

const toFib = (
    x: number,
    how: 'nearest' | 'ceil' = 'nearest',
    fibs: readonly VotingValue[] = votingValues
): number => {
    if (fibs.length === 0) throw new Error('scale is empty');

    if (how === 'ceil') {
        return (
            fibs.find((card) => card.value >= x)?.value ??
            fibs[fibs.length - 1].value
        );
    }

    // "nearest": reduce to the card with the smallest distance to x
    return fibs.reduce(
        (best, card) =>
            Math.abs(card.value - x) < Math.abs(best.value - x) ? card : best,
        fibs[0]
    ).value;
};

const suggestedVote = (votes: VoteModel[]): SuggestedVote => {
    if (!votes.length) throw new Error('no votes');

    const nums = votes.map((v) => v.vote);

    // ── mode & its frequency ──────────────────────────────────────────────
    const freq = new Map<number, number>();
    nums.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1));
    const [mode, maxFreq] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];

    // if there is a strong majority, return the mode

    if (maxFreq / nums.length >= 0.5)
        return { vote: mode, rule: SuggestedVoteRule.rule1 };

    // ── mean & coefficient of variation ──────────────────────────────────
    const mean = nums.reduce((a, b) => a + b) / nums.length;
    const sd = Math.sqrt(
        nums.reduce((s, x) => s + (x - mean) ** 2, 0) / nums.length
    );
    const cv = sd / mean;
    // if the s.d is less than 0.25, return the nearest Fibonacci number
    if (cv <= 0.25)
        return { vote: toFib(mean, 'nearest'), rule: SuggestedVoteRule.rule2 };
    // there is high uncertainty, so return next estimate in the Fibonacci sequence as erring high absorbs the risk
    else return { vote: toFib(mean, 'ceil'), rule: SuggestedVoteRule.rule3 };
};

export const socket_showVotes = (ticket: TicketForVoting) => {
    const sum = ticket.votes.reduce((acc, vote) => acc + vote.vote, 0);
    const totalVotes = ticket.votes.filter((v) => v.vote > 0).length;

    ticket.average_vote = parseFloat((sum / totalVotes).toFixed(2));
    ticket.mode = calculateMode(ticket.votes);
    ticket.suggested_vote = suggestedVote(ticket.votes);

    if (totalVotes === 0 || totalVotes === 1) {
        ticket.standard_deviation = 0;
        return ticket;
    }

    ticket.standard_deviation = parseFloat(
        Math.sqrt(
            ticket.votes.reduce(
                (acc, vote) =>
                    acc + (vote.vote - (ticket.average_vote || 0)) ** 2,
                0
            ) / totalVotes
        ).toFixed(2)
    );

    return ticket;
};
