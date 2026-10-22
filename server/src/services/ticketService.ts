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
    // votes reference the ticket, so they must go first
    await voteRepository.deleteVotesForTicket(ticketId);
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
