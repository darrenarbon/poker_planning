import { describe, expect, it, vi } from 'vitest';

import { supabase } from '../db/supabase.js';
import { makeTicket } from '../test/factories.js';
import { fail, ok, queueResults } from '../test/supabaseMock.js';
import {
    createTickets,
    deleteTicket,
    findTicketById,
    findTicketsByRoom,
    updateTicketEstimate,
} from './ticketRepository.js';

vi.mock('../db/supabase.js', () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

describe('ticketRepository', () => {
    it('findTicketById returns the ticket', async () => {
        const ticket = makeTicket();
        const [query] = queueResults(from, ok([ticket]));
        await expect(findTicketById(100)).resolves.toEqual(ticket);
        expect(query.eq).toHaveBeenCalledWith('ticket_id', 100);
    });

    it('findTicketsByRoom orders by ticket number', async () => {
        const [query] = queueResults(from, ok([]));
        await findTicketsByRoom(10);
        expect(query.order).toHaveBeenCalledWith('ticket_number', {
            ascending: true,
        });
        expect(query.eq).toHaveBeenCalledWith('room_id', 10);
    });

    it('createTickets inserts one row per ticket number', async () => {
        const [query] = queueResults(from, ok([makeTicket()]));
        await createTickets(10, ['PP-1', 'PP-2']);
        expect(query.insert).toHaveBeenCalledWith([
            { room_id: 10, ticket_number: 'PP-1' },
            { room_id: 10, ticket_number: 'PP-2' },
        ]);
    });

    it('createTickets throws on a db error', async () => {
        queueResults(from, fail());
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
});
