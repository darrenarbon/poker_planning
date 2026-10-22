import { describe, expect, it, vi } from 'vitest';

import { supabase } from '../db/supabase.js';
import { makeTicket } from '../test/factories.js';
import { fail, ok, queueResults } from '../test/supabaseMock.js';
import {
    createTickets,
    deleteTicket,
    findTicketById,
    findTicketsByRoom,
    reorderTickets,
    updateTicketEstimate,
} from './ticketRepository.js';

vi.mock('../db/supabase.js', () => ({
    supabase: { from: vi.fn(), rpc: vi.fn() },
}));
const from = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;
const rpc = vi.mocked(supabase.rpc) as unknown as ReturnType<typeof vi.fn>;

describe('ticketRepository', () => {
    it('findTicketById returns the ticket', async () => {
        const ticket = makeTicket();
        const [query] = queueResults(from, ok([ticket]));
        await expect(findTicketById(100)).resolves.toEqual(ticket);
        expect(query.eq).toHaveBeenCalledWith('ticket_id', 100);
    });

    it('findTicketsByRoom orders by sort order, then ticket number', async () => {
        const [query] = queueResults(from, ok([]));
        await findTicketsByRoom(10);
        expect(query.order).toHaveBeenNthCalledWith(1, 'sort_order', {
            ascending: true,
        });
        expect(query.order).toHaveBeenNthCalledWith(2, 'ticket_number', {
            ascending: true,
        });
        expect(query.eq).toHaveBeenCalledWith('room_id', 10);
    });

    it('createTickets adds the tickets after the last one, in order', async () => {
        const [, query] = queueResults(
            from,
            ok([{ sort_order: 4 }]),
            ok([makeTicket()])
        );
        await createTickets(10, ['PP-1', 'PP-2']);
        expect(query.insert).toHaveBeenCalledWith([
            { room_id: 10, ticket_number: 'PP-1', sort_order: 5 },
            { room_id: 10, ticket_number: 'PP-2', sort_order: 6 },
        ]);
    });

    it('createTickets starts an empty sprint at zero', async () => {
        const [, query] = queueResults(from, ok([]), ok([makeTicket()]));
        await createTickets(10, ['PP-1']);
        expect(query.insert).toHaveBeenCalledWith([
            { room_id: 10, ticket_number: 'PP-1', sort_order: 0 },
        ]);
    });

    it('createTickets throws on a db error', async () => {
        queueResults(from, ok([]), fail());
        await expect(createTickets(10, ['PP-1'])).rejects.toMatchObject({
            message: 'Error adding tickets',
        });
    });

    it('deleteTicket deletes by id', async () => {
        const [query] = queueResults(from, ok(null));
        await deleteTicket('100');
        expect(query.delete).toHaveBeenCalled();
        expect(query.eq).toHaveBeenCalledWith('ticket_id', '100');
    });

    it('updateTicketEstimate updates the estimate fields', async () => {
        const [query] = queueResults(from, ok(null));
        const estimate = {
            chosen_estimate: 5,
            average_vote: 4.5,
            standard_deviation: 1,
        };
        await updateTicketEstimate(100, estimate);
        expect(query.update).toHaveBeenCalledWith(estimate);
        expect(query.eq).toHaveBeenCalledWith('ticket_id', 100);
    });

    it('reorderTickets saves the order in one call', async () => {
        rpc.mockResolvedValueOnce(ok(null));
        await reorderTickets(10, [3, 1, 2]);
        expect(rpc).toHaveBeenCalledWith('reorder_tickets', {
            p_room_id: 10,
            p_ticket_ids: [3, 1, 2],
        });
    });

    it('reorderTickets throws on a db error', async () => {
        rpc.mockResolvedValueOnce(fail());
        await expect(reorderTickets(10, [1])).rejects.toMatchObject({
            message: 'Error reordering tickets',
        });
    });
});
