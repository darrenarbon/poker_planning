import { describe, expect, it } from 'vitest';
import { makeTicket } from '../test/factories';
import { findVote, replaceTicket, withVote } from './votes';

describe('findVote', () => {
    it("returns the user's vote", () => {
        const ticket = makeTicket({ votes: [{ usersub: 'u1', vote: 5 }] });
        expect(findVote(ticket, 'u1')).toBe(5);
    });

    it('returns 0 for a No Idea vote rather than null', () => {
        const ticket = makeTicket({ votes: [{ usersub: 'u1', vote: 0 }] });
        expect(findVote(ticket, 'u1')).toBe(0);
    });

    it('returns null when the user has not voted', () => {
        expect(findVote(makeTicket(), 'u1')).toBeNull();
    });
});

describe('withVote', () => {
    it('adds a vote for a new user', () => {
        const ticket = makeTicket();
        expect(withVote(ticket, 3, 'u1').votes).toEqual([
            { usersub: 'u1', vote: 3 },
        ]);
    });

    it("replaces an existing user's vote", () => {
        const ticket = makeTicket({
            votes: [
                { usersub: 'u1', vote: 3 },
                { usersub: 'u2', vote: 8 },
            ],
        });
        expect(withVote(ticket, 5, 'u1').votes).toEqual([
            { usersub: 'u1', vote: 5 },
            { usersub: 'u2', vote: 8 },
        ]);
    });

    it('does not mutate the original ticket', () => {
        const ticket = makeTicket({ votes: [{ usersub: 'u1', vote: 3 }] });
        const updated = withVote(ticket, 5, 'u1');
        expect(updated).not.toBe(ticket);
        expect(ticket.votes).toEqual([{ usersub: 'u1', vote: 3 }]);
    });
});

describe('replaceTicket', () => {
    it('replaces the ticket with a matching id and keeps the rest', () => {
        const a = makeTicket({ ticket_id: 'a' });
        const b = makeTicket({ ticket_id: 'b' });
        const updatedB = { ...b, chosen_estimate: 5 };
        const result = replaceTicket([a, b], updatedB);
        expect(result).toEqual([a, updatedB]);
        expect(result[0]).toBe(a);
    });

    it('returns an equivalent list when no ticket matches', () => {
        const a = makeTicket({ ticket_id: 'a' });
        expect(replaceTicket([a], makeTicket({ ticket_id: 'z' }))).toEqual([a]);
    });
});
