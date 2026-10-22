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

/** The room's current sprint: every ticket that has not been archived. */
export const findTicketsByRoom = async (roomId: number): Promise<Ticket[]> => {
    const { data, error } = await supabase
        .from('ticket')
        .select()
        .order('ticket_number', { ascending: true })
        .eq('room_id', roomId)
        .is('archived_at', null);
    assertNoDbError(error, 'Error fetching tickets');
    return data ?? [];
};

/** Tickets from past sprints, newest archive first. */
export const findArchivedTicketsByRoom = async (
    roomId: number
): Promise<Ticket[]> => {
    const { data, error } = await supabase
        .from('ticket')
        .select()
        .eq('room_id', roomId)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
        .order('ticket_number', { ascending: true });
    assertNoDbError(error, 'Error fetching archived tickets');
    return data ?? [];
};

/** Archives every current ticket in the room, returning when it happened. */
export const archiveTickets = async (roomId: number) => {
    const archivedAt = new Date().toISOString();
    const { error } = await supabase
        .from('ticket')
        .update({ archived_at: archivedAt })
        .eq('room_id', roomId)
        .is('archived_at', null);
    assertNoDbError(error, 'Error archiving tickets');
    return archivedAt;
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

/** Hides the votes again and forgets any estimate, ready for a re-vote. */
export const resetTicketVoting = async (ticketId: number) => {
    const { error } = await supabase
        .from('ticket')
        .update({
            votes_revealed: false,
            chosen_estimate: null,
            average_vote: null,
            standard_deviation: null,
        })
        .eq('ticket_id', ticketId);
    assertNoDbError(error, 'Error resetting ticket');
};

export const updateVotesRevealed = async (
    ticketId: number,
    votesRevealed: boolean
) => {
    const { error } = await supabase
        .from('ticket')
        .update({ votes_revealed: votesRevealed })
        .eq('ticket_id', ticketId);
    assertNoDbError(error, 'Error revealing votes');
};
