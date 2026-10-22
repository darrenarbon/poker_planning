import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as roomService from '../../services/roomService.js';
import * as ticketService from '../../services/ticketService.js';
import * as voteService from '../../services/voteService.js';
import { makeTicket, makeUser } from '../../test/factories.js';
import { createFakeSocket } from '../../test/fakeSocket.js';
import { notFound } from '../../utils/errors.js';
import { registerJoinHandler } from './joinHandler.js';
import { registerSetEstimateHandler } from './setEstimateHandler.js';
import { registerShowVotesHandler } from './showVotesHandler.js';
import { registerVoteHandler } from './voteHandler.js';

vi.mock('../../services/roomService.js');
vi.mock('../../services/ticketService.js');
vi.mock('../../services/voteService.js');

let fake: ReturnType<typeof createFakeSocket>;

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake = createFakeSocket();
});

describe('join', () => {
    beforeEach(() => registerJoinHandler(fake.socket, fake.io));

    it('joins the room and tells others who is in it', async () => {
        const users = [makeUser()];
        vi.mocked(roomService.joinRoom).mockResolvedValue(users);

        await fake.trigger('join', { roomName: 'abc', userSub: 'auth0|u' });

        expect(fake.socket.join).toHaveBeenCalledWith('abc');
        expect(roomService.joinRoom).toHaveBeenCalledWith('abc', 'auth0|u');
        expect(fake.socket.to).toHaveBeenCalledWith('abc');
        expect(fake.roomEmit).toHaveBeenCalledWith('userJoined', { users });
    });

    it('ignores joins without a user', async () => {
        await fake.trigger('join', { roomName: 'abc' });
        expect(fake.socket.join).not.toHaveBeenCalled();
        expect(roomService.joinRoom).not.toHaveBeenCalled();
    });

    it('emits an error for an unknown room', async () => {
        vi.mocked(roomService.joinRoom).mockRejectedValue(
            notFound('Room not found')
        );
        await fake.trigger('join', { roomName: 'nope', userSub: 'auth0|u' });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Room not found'
        );
        expect(fake.roomEmit).not.toHaveBeenCalled();
    });
});

describe('vote', () => {
    beforeEach(() => registerVoteHandler(fake.socket, fake.io));
    const payload = { roomName: 'abc', ticketId: 1, vote: '5', userSub: 'u' };

    it('records the vote and tells the room', async () => {
        await fake.trigger('vote', payload);
        expect(voteService.castVote).toHaveBeenCalledWith(1, 'u', '5');
        expect(fake.roomEmit).toHaveBeenCalledWith('voteReceived', {
            ticketId: 1,
            vote: '5',
            userSub: 'u',
        });
    });

    it('rejects an empty vote', async () => {
        await fake.trigger('vote', { ...payload, vote: '' });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'No vote was submitted'
        );
        expect(voteService.castVote).not.toHaveBeenCalled();
    });

    it('emits an error when saving fails', async () => {
        vi.mocked(voteService.castVote).mockRejectedValue(
            notFound('User not found')
        );
        await fake.trigger('vote', payload);
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'User not found'
        );
        expect(fake.roomEmit).not.toHaveBeenCalled();
    });
});

describe('showVotes', () => {
    beforeEach(() => registerShowVotesHandler(fake.socket, fake.io));

    it('reveals votes to everyone in the room, including the sender', async () => {
        vi.mocked(ticketService.getTicketInRoom).mockResolvedValue(
            makeTicket()
        );
        await fake.trigger('showVotes', { roomName: 'abc', ticketId: 1 });
        expect(ticketService.getTicketInRoom).toHaveBeenCalledWith('abc', 1);
        expect(fake.io.in).toHaveBeenCalledWith('abc');
        expect(fake.ioEmit).toHaveBeenCalledWith('showVotes', { ticketId: 1 });
    });

    it('emits an error for a ticket outside the room', async () => {
        vi.mocked(ticketService.getTicketInRoom).mockRejectedValue(
            notFound('Ticket not found')
        );
        await fake.trigger('showVotes', { roomName: 'abc', ticketId: 1 });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Ticket not found'
        );
        expect(fake.ioEmit).not.toHaveBeenCalled();
    });
});

describe('setEstimate', () => {
    beforeEach(() => registerSetEstimateHandler(fake.socket, fake.io));
    const currentTicket = {
        ticket_id: 1,
        chosen_estimate: 5,
        average_vote: 4.5,
        standard_deviation: 0.5,
        ticket_number: 'PP-1',
    };

    it('saves the estimate and tells the room', async () => {
        await fake.trigger('setEstimate', { roomName: 'abc', currentTicket });
        expect(ticketService.setEstimate).toHaveBeenCalledWith('abc', 1, {
            chosen_estimate: 5,
            average_vote: 4.5,
            standard_deviation: 0.5,
        });
        expect(fake.roomEmit).toHaveBeenCalledWith('showEstimate', {
            currentTicket,
        });
    });

    it('emits an error for an unknown room', async () => {
        vi.mocked(ticketService.setEstimate).mockRejectedValue(
            notFound('Room not found')
        );
        await fake.trigger('setEstimate', { roomName: 'nope', currentTicket });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Room not found'
        );
        expect(fake.roomEmit).not.toHaveBeenCalled();
    });
});
