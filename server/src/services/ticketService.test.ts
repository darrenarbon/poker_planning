import { describe, expect, it, vi } from 'vitest';

import * as roomRepository from '../repositories/roomRepository.js';
import * as ticketRepository from '../repositories/ticketRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as voteRepository from '../repositories/voteRepository.js';
import { makeRoom, makeTicket, makeUser } from '../test/factories.js';
import {
    addTicketsToRoom,
    deleteTicket,
    getTicketById,
    getTicketInRoom,
    setEstimate,
} from './ticketService.js';

vi.mock('../repositories/roomRepository.js');
vi.mock('../repositories/ticketRepository.js');
vi.mock('../repositories/userRepository.js');
vi.mock('../repositories/voteRepository.js');

const room = makeRoom();
const ticket = makeTicket({ room_id: room.room_id });
const admin = makeUser({ user_id: room.admin_id });
const other = makeUser({ user_id: 2, auth0_sub: 'auth0|other' });

const actAs = (user = admin) =>
    vi.mocked(userRepository.findUserBySub).mockResolvedValue(user);

describe('getTicketById', () => {
    it('returns the ticket', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(ticket);
        await expect(getTicketById(ticket.ticket_id)).resolves.toEqual(ticket);
    });

    it('throws 404 when missing', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(undefined);
        await expect(getTicketById(1)).rejects.toMatchObject({
            status: 404,
            message: 'Ticket not found',
        });
    });
});

describe('addTicketsToRoom', () => {
    it('creates the tickets in the named room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        vi.mocked(ticketRepository.createTickets).mockResolvedValue([ticket]);
        actAs();

        await expect(
            addTicketsToRoom(room.room_name, admin.auth0_sub, ['PP-1'])
        ).resolves.toEqual([ticket]);
        expect(ticketRepository.createTickets).toHaveBeenCalledWith(
            room.room_id,
            ['PP-1']
        );
    });

    it('throws 404 for an unknown room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(undefined);
        await expect(
            addTicketsToRoom('nope', admin.auth0_sub, ['PP-1'])
        ).rejects.toMatchObject({ status: 404 });
        expect(ticketRepository.createTickets).not.toHaveBeenCalled();
    });

    it('throws 403 for someone other than the room admin', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        actAs(other);
        await expect(
            addTicketsToRoom(room.room_name, other.auth0_sub, ['PP-1'])
        ).rejects.toMatchObject({ status: 403 });
        expect(ticketRepository.createTickets).not.toHaveBeenCalled();
    });
});

describe('deleteTicket', () => {
    it('deletes an existing ticket and its votes first', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(ticket);
        vi.mocked(roomRepository.findRoomById).mockResolvedValue(room);
        actAs();
        await deleteTicket('100', admin.auth0_sub);
        expect(voteRepository.deleteVotesForTicket).toHaveBeenCalledWith('100');
        expect(ticketRepository.deleteTicket).toHaveBeenCalledWith('100');
        expect(
            vi.mocked(voteRepository.deleteVotesForTicket).mock
                .invocationCallOrder[0]
        ).toBeLessThan(
            vi.mocked(ticketRepository.deleteTicket).mock.invocationCallOrder[0]
        );
    });

    it('throws 404 and deletes nothing when missing', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(undefined);
        await expect(
            deleteTicket('100', admin.auth0_sub)
        ).rejects.toMatchObject({ status: 404 });
        expect(ticketRepository.deleteTicket).not.toHaveBeenCalled();
        expect(voteRepository.deleteVotesForTicket).not.toHaveBeenCalled();
    });

    it('throws 403 and deletes nothing for someone other than the room admin', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(ticket);
        vi.mocked(roomRepository.findRoomById).mockResolvedValue(room);
        actAs(other);
        await expect(
            deleteTicket('100', other.auth0_sub)
        ).rejects.toMatchObject({ status: 403 });
        expect(ticketRepository.deleteTicket).not.toHaveBeenCalled();
        expect(voteRepository.deleteVotesForTicket).not.toHaveBeenCalled();
    });
});

describe('getTicketInRoom', () => {
    it('returns a ticket that belongs to the room', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(ticket);
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        await expect(
            getTicketInRoom(room.room_name, ticket.ticket_id)
        ).resolves.toEqual(ticket);
    });

    it('throws 404 for a ticket in a different room', async () => {
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(
            makeTicket({ room_id: 999 })
        );
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        await expect(
            getTicketInRoom(room.room_name, ticket.ticket_id)
        ).rejects.toMatchObject({ message: 'Ticket not found' });
    });
});

describe('setEstimate', () => {
    const estimate = {
        chosen_estimate: 5,
        average_vote: 4,
        standard_deviation: 1,
    };

    it('updates the ticket estimate', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(ticket);
        await setEstimate(room.room_name, ticket.ticket_id, estimate);
        expect(ticketRepository.updateTicketEstimate).toHaveBeenCalledWith(
            ticket.ticket_id,
            estimate
        );
    });

    it('throws 404 for an unknown room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(undefined);
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(ticket);
        await expect(setEstimate('nope', 1, estimate)).rejects.toMatchObject({
            message: 'Room not found',
        });
        expect(ticketRepository.updateTicketEstimate).not.toHaveBeenCalled();
    });

    it('throws 404 for a ticket in a different room', async () => {
        vi.mocked(roomRepository.findRoomByName).mockResolvedValue(room);
        vi.mocked(ticketRepository.findTicketById).mockResolvedValue(
            makeTicket({ room_id: 999 })
        );
        await expect(
            setEstimate(room.room_name, 1, estimate)
        ).rejects.toMatchObject({ message: 'Ticket not found' });
        expect(ticketRepository.updateTicketEstimate).not.toHaveBeenCalled();
    });
});
