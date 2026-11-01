import { describe, expect, it } from 'vitest';
import { makeTicket } from '../test/factories';
import { VoteModel } from '../types';
import { calculateSessionStats, isSessionComplete } from './sessionStats';

const votes = (byUser: Record<string, number>): VoteModel[] =>
    Object.entries(byUser).map(([usersub, vote]) => ({ usersub, vote }));

const ticket = (id: string, byUser: Record<string, number>) =>
    makeTicket({ ticket_id: id, votes: votes(byUser), votes_revealed: true });

describe('isSessionComplete', () => {
    it('is false with no tickets', () => {
        expect(isSessionComplete([])).toBe(false);
    });

    it('is false while any ticket is unrevealed', () => {
        expect(
            isSessionComplete([ticket('a', {}), makeTicket({ ticket_id: 'b' })])
        ).toBe(false);
    });

    it('is true once every ticket is revealed', () => {
        expect(isSessionComplete([ticket('a', {}), ticket('b', {})])).toBe(
            true
        );
    });
});

describe('calculateSessionStats', () => {
    const tickets = [
        ticket('1', { ada: 3, bob: 3, cy: 13 }),
        ticket('2', { ada: 5, bob: 5, cy: 5 }),
        ticket('3', { ada: 8, bob: 8, cy: 8 }),
        ticket('4', { ada: 2, bob: 3, cy: 13 }),
        ticket('5', { ada: 1, bob: 1, cy: 1 }),
    ];

    it('finds the pair whose votes are closest', () => {
        expect(calculateSessionStats(tickets).alignedPair).toEqual({
            subs: ['ada', 'bob'],
            averageGap: 0.2,
            sharedTickets: 5,
        });
    });

    it('finds the voter furthest from the room on average', () => {
        expect(calculateSessionStats(tickets).boldest?.sub).toBe('cy');
    });

    it('counts the longest run of unanimous tickets', () => {
        const stats = calculateSessionStats(tickets);
        expect(stats.longestStreak).toBe(2);
        expect(stats.consensusCount).toBe(3);
        expect(stats.ticketCount).toBe(5);
    });

    it('ignores "No Idea" votes', () => {
        const stats = calculateSessionStats([
            ticket('1', { ada: 0, bob: 5 }),
            ticket('2', { ada: 0, bob: 8 }),
        ]);
        expect(stats.alignedPair).toBeNull();
        expect(stats.boldest).toBeNull();
    });

    it('has no bold estimator when everyone always agrees', () => {
        const stats = calculateSessionStats([
            ticket('1', { ada: 5, bob: 5 }),
            ticket('2', { ada: 8, bob: 8 }),
        ]);
        expect(stats.boldest).toBeNull();
        expect(stats.alignedPair?.averageGap).toBe(0);
    });
});
