import * as ticketRepository from '../repositories/ticketRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import type { Ticket, TicketEstimate } from '../types/models.js';
import { notFound } from '../utils/errors.js';
import {
    getRoomAsAdmin,
    getRoomByIdAsAdmin,
    getRoomByName,
} from './roomService.js';

export const getTicketById = async (
    ticketId: number | string
): Promise<Ticket> => {
    const ticket = await ticketRepository.findTicketById(ticketId);
    if (!ticket) {
        throw notFound('Ticket not found');
    }
    return ticket;
};

export const addTicketsToRoom = async (
    roomName: string,
    userSub: string,
    ticketNumbers: string[]
) => {
    const room = await getRoomAsAdmin(roomName, userSub);
    return ticketRepository.createTickets(room.room_id, ticketNumbers);
};

export const deleteTicket = async (ticketId: string, userSub: string) => {
    const ticket = await getTicketById(ticketId);
    await getRoomByIdAsAdmin(ticket.room_id, userSub);
    // the vote foreign key cascades, so its votes go in the same statement
    await ticketRepository.deleteTicket(ticketId);
};

/** Ensures the ticket exists and belongs to the named room. */
export const getTicketInRoom = async (roomName: string, ticketId: number) => {
    const ticket = await getTicketById(ticketId);
    const room = await getRoomByName(roomName);
    if (ticket.room_id !== room.room_id) {
        throw notFound('Ticket not found');
    }
    return ticket;
};

export const setEstimate = async (
    roomName: string,
    ticketId: number,
    estimate: TicketEstimate
) => {
    await getTicketInRoom(roomName, ticketId);
    await ticketRepository.updateTicketEstimate(ticketId, estimate);
};

/** Marks the ticket's votes as revealed, so late joiners and refreshes see them. */
export const revealVotes = async (roomName: string, ticketId: number) => {
    await getTicketInRoom(roomName, ticketId);
    await ticketRepository.updateVotesRevealed(ticketId, true);
};

/** Clears a ticket's votes and hides them again so the team can vote afresh. */
export const resetVotes = async (roomName: string, ticketId: number) => {
    await getTicketInRoom(roomName, ticketId);
    await voteRepository.deleteVotesForTicket(ticketId);
    await ticketRepository.resetTicketVoting(ticketId);
};

/** Starts a new sprint: archives the current tickets, keeping the room's link. */
export const archiveSprint = async (roomName: string, userSub: string) => {
    const room = await getRoomAsAdmin(roomName, userSub);
    return ticketRepository.archiveTickets(room.room_id);
};
