import { describe, expect, it, vi } from 'vitest';

import { supabase } from '../db/supabase.js';
import { makeVote } from '../test/factories.js';
import { fail, ok, queueResults } from '../test/supabaseMock.js';
import {
    createVote,
    deleteVotesForTicket,
    findVote,
    findVotesForTickets,
    updateVote,
} from './voteRepository.js';

vi.mock('../db/supabase.js', () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

describe('voteRepository', () => {
    it('findVotesForTickets skips the query for no tickets', async () => {
        await expect(findVotesForTickets([])).resolves.toEqual([]);
        expect(from).not.toHaveBeenCalled();
    });

    it('findVotesForTickets queries all tickets at once', async () => {
        const votes = [{ vote: '3', ticket_id: 1, usersub: 'a' }];
        const [query] = queueResults(from, ok(votes));
        await expect(findVotesForTickets([1, 2])).resolves.toEqual(votes);
        expect(query.in).toHaveBeenCalledWith('ticket_id', [1, 2]);
    });

    it('findVotesForTickets throws on a db error', async () => {
        queueResults(from, fail());
        await expect(findVotesForTickets([1])).rejects.toMatchObject({
            message: 'Error fetching votes',
        });
    });

    it("findVote returns the user's vote on a ticket", async () => {
        const vote = makeVote();
        const [query] = queueResults(from, ok([vote]));
        await expect(findVote(100, 1)).resolves.toEqual(vote);
        expect(query.eq).toHaveBeenCalledWith('ticket_id', 100);
        expect(query.eq).toHaveBeenCalledWith('user_id', 1);
    });

    it('updateVote updates by vote id', async () => {
        const [query] = queueResults(from, ok(null));
        await updateVote(1000, '8');
        expect(query.update).toHaveBeenCalledWith({ vote: '8' });
        expect(query.eq).toHaveBeenCalledWith('vote_id', 1000);
    });

    it('createVote inserts a vote', async () => {
        const [query] = queueResults(from, ok(null));
        await createVote(100, 1, '5');
        expect(query.insert).toHaveBeenCalledWith({
            ticket_id: 100,
            user_id: 1,
            vote: '5',
        });
    });

    it('deleteVotesForTicket deletes by ticket id', async () => {
        const [query] = queueResults(from, ok(null));
        await deleteVotesForTicket('100');
        expect(query.delete).toHaveBeenCalled();
        expect(query.eq).toHaveBeenCalledWith('ticket_id', '100');
    });
});
