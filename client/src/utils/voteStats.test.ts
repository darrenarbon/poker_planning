import { describe, expect, it } from 'vitest';
import { makeTicket } from '../test/factories';
import { SuggestedVoteRule, VoteModel } from '../types';
import { calculateMode, suggestVote, toFib, withVoteStats } from './voteStats';

const votes = (...values: number[]): VoteModel[] =>
    values.map((vote, i) => ({ vote, usersub: `u${i}` }));

describe('calculateMode', () => {
    it('returns undefined for no votes', () => {
        expect(calculateMode([])).toBeUndefined();
    });

    it('returns the single most common value', () => {
        expect(calculateMode(votes(3, 5, 5))).toBe(5);
    });

    it('returns every tied value in ascending order', () => {
        expect(calculateMode(votes(8, 3, 8, 3, 1))).toEqual([3, 8]);
    });
});

describe('toFib', () => {
    it.each([
        [4, 3],
        [6, 5],
        [7, 8],
        [100, 21],
    ])('rounds %d to the nearest card %d', (input, expected) => {
        expect(toFib(input, 'nearest')).toBe(expected);
    });

    it.each([
        [4, 5],
        [5, 5],
        [9, 13],
        [100, 21],
    ])('rounds %d up to card %d', (input, expected) => {
        expect(toFib(input, 'ceil')).toBe(expected);
    });

    it('throws on an empty scale', () => {
        expect(() => toFib(3, 'nearest', [])).toThrow('scale is empty');
    });
});

describe('suggestVote', () => {
    it('throws when there are no votes', () => {
        expect(() => suggestVote([])).toThrow('no votes');
    });

    it('uses the mode when half or more agree', () => {
        expect(suggestVote(votes(5, 5, 8, 3))).toEqual({
            vote: 5,
            rule: SuggestedVoteRule.rule1,
        });
    });

    it('picks the highest value when the most common votes tie', () => {
        expect(suggestVote(votes(3, 5)).vote).toBe(5);
        expect(suggestVote(votes(8, 2, 2, 8)).vote).toBe(8);
    });

    it('uses the nearest card to the mean when votes are tightly clustered', () => {
        // no majority, mean 14, cv ~0.06
        expect(suggestVote(votes(13, 14, 15))).toEqual({
            vote: 13,
            rule: SuggestedVoteRule.rule2,
        });
    });

    it('rounds the mean up when votes are spread out', () => {
        // mean 4, cv ~0.75
        expect(suggestVote(votes(1, 3, 8))).toEqual({
            vote: 5,
            rule: SuggestedVoteRule.rule3,
        });
    });
});

describe('withVoteStats', () => {
    it('fills in average, deviation, mode and suggestion', () => {
        const result = withVoteStats(makeTicket({ votes: votes(5, 5, 8) }));
        expect(result).toMatchObject({
            average_vote: 6,
            standard_deviation: 1.41,
            mode: 5,
            suggested_vote: { vote: 5 },
        });
    });

    it('excludes No Idea votes from every statistic', () => {
        const result = withVoteStats(makeTicket({ votes: votes(0, 3, 5) }));
        expect(result).toMatchObject({
            average_vote: 4,
            standard_deviation: 1,
            mode: [3, 5],
            suggested_vote: { vote: 5 },
        });
    });

    it('leaves stats unset when there are no votes', () => {
        const result = withVoteStats(makeTicket());
        expect(result.average_vote).toBeUndefined();
        expect(result.suggested_vote).toBeUndefined();
    });

    it('leaves stats unset when every vote is No Idea', () => {
        const result = withVoteStats(
            makeTicket({ votes: votes(0, 0), average_vote: 3 })
        );
        expect(result.average_vote).toBeUndefined();
        expect(result.standard_deviation).toBeUndefined();
        expect(result.mode).toBeUndefined();
        expect(result.suggested_vote).toBeUndefined();
    });

    it('reports zero deviation for a single vote', () => {
        expect(
            withVoteStats(makeTicket({ votes: votes(8) })).standard_deviation
        ).toBe(0);
    });

    it('keeps the votes and does not mutate the ticket', () => {
        const ticket = makeTicket({ votes: votes(3, 5) });
        const result = withVoteStats(ticket);
        expect(result.votes).toBe(ticket.votes);
        expect(ticket.average_vote).toBeUndefined();
    });
});
