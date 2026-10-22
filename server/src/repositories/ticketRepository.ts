import { supabase } from '../db/supabase.js';
import type { Ticket, TicketEstimate } from '../types/models.js';
import { assertNoDbError } from '../utils/errors.js';

export const findTicketById = async (
    ticketId: number | string
): Promise<Ticket | undefined> => {
    const { data, error } = await supabase
        .from('ticket')
        .select()
        .eq('ticket_id', ticketId);
    assertNoDbError(error, 'Error fetching ticket');
    return data?.[0];
};

export const findTicketsByRoom = async (roomId: number): Promise<Ticket[]> => {
    const { data, error } = await supabase
        .from('ticket')
        .select()
        .order('ticket_number', { ascending: true })
        .eq('room_id', roomId);
    assertNoDbError(error, 'Error fetching tickets');
    return data ?? [];
};

export const createTickets = async (
    roomId: number,
    ticketNumbers: string[]
): Promise<Ticket[]> => {
    const { data, error } = await supabase
        .from('ticket')
        .insert(
            ticketNumbers.map((ticket_number) => ({
                room_id: roomId,
                ticket_number,
            }))
        )
        .select();
    assertNoDbError(error, 'Error adding tickets');
    return data ?? [];
};

export const deleteTicket = async (ticketId: number | string) => {
    const { error } = await supabase
        .from('ticket')
        .delete()
        .eq('ticket_id', ticketId);
    assertNoDbError(error, 'Error deleting ticket');
};

export const updateTicketEstimate = async (
    ticketId: number,
    estimate: TicketEstimate
) => {
    const { error } = await supabase
        .from('ticket')
        .update(estimate)
        .eq('ticket_id', ticketId);
    assertNoDbError(error, 'Error updating ticket');
};
