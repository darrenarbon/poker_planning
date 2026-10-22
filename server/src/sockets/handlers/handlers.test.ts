import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as roomService from '../../services/roomService.js';
import * as ticketService from '../../services/ticketService.js';
import * as voteService from '../../services/voteService.js';
import { makeRoom, makeTicket, makeUser } from '../../test/factories.js';
import { createFakeSocket } from '../../test/fakeSocket.js';
import { AppError, notFound } from '../../utils/errors.js';
import { registerJoinHandler } from './joinHandler.js';
import { registerSetEstimateHandler } from './setEstimateHandler.js';
import { registerShowVotesHandler } from './showVotesHandler.js';
import { registerVoteHandler } from './voteHandler.js';

vi.mock('../../services/roomService.js');
vi.mock('../../services/ticketService.js');
vi.mock('../../services/voteService.js');

let fake: ReturnType<typeof createFakeSocket>;

const notAdmin = () =>
    vi
        .mocked(roomService.getRoomAsAdmin)
        .mockRejectedValue(
            new AppError(403, 'Only the room admin can do that')
        );

beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake = createFakeSocket('auth0|u');
});

describe('join', () => {
    beforeEach(() => registerJoinHandler(fake.socket, fake.io));

    it('joins the room as the authenticated user and tells others', async () => {
        const users = [makeUser()];
        vi.mocked(roomService.joinRoom).mockResolvedValue(users);

        await fake.trigger('join', {
            roomName: 'abc',
            userSub: 'auth0|someone-else',
        });

        expect(fake.socket.join).toHaveBeenCalledWith('abc');
        expect(roomService.joinRoom).toHaveBeenCalledWith('abc', 'auth0|u');
        expect(fake.socket.to).toHaveBeenCalledWith('abc');
        expect(fake.roomEmit).toHaveBeenCalledWith('userJoined', { users });
    });

    it('rejects an unauthenticated socket', async () => {
        fake.socket.data.userSub = undefined;
        await fake.trigger('join', { roomName: 'abc' });
        expect(fake.socket.emit).toHaveBeenCalledWith('error', 'Unauthorized');
        expect(fake.socket.join).not.toHaveBeenCalled();
        expect(roomService.joinRoom).not.toHaveBeenCalled();
    });

    it('emits an error and does not join an unknown room', async () => {
        vi.mocked(roomService.joinRoom).mockRejectedValue(
            notFound('Room not found')
        );
        await fake.trigger('join', { roomName: 'nope' });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Room not found'
        );
        expect(fake.socket.join).not.toHaveBeenCalled();
        expect(fake.roomEmit).not.toHaveBeenCalled();
    });
});

describe('vote', () => {
    beforeEach(() => {
        registerVoteHandler(fake.socket, fake.io);
        fake.socket.rooms.add('abc');
        vi.mocked(ticketService.getTicketInRoom).mockResolvedValue(
            makeTicket()
        );
    });
    const payload = { roomName: 'abc', ticketId: 1, vote: 5 };

    it('records the vote as the authenticated user and tells the room', async () => {
        await fake.trigger('vote', { ...payload, userSub: 'auth0|victim' });
        expect(ticketService.getTicketInRoom).toHaveBeenCalledWith('abc', 1);
        expect(voteService.castVote).toHaveBeenCalledWith(1, 'auth0|u', 5);
        expect(fake.roomEmit).toHaveBeenCalledWith('voteReceived', {
            ticketId: 1,
            vote: 5,
            userSub: 'auth0|u',
        });
    });

    it('accepts a "No Idea" vote of 0', async () => {
        await fake.trigger('vote', { ...payload, vote: 0 });
        expect(voteService.castVote).toHaveBeenCalledWith(1, 'auth0|u', 0);
    });

    it.each(['', '5', null, 2.5, -1])(
        'rejects an invalid vote (%s)',
        async (vote) => {
            await fake.trigger('vote', { ...payload, vote });
            expect(fake.socket.emit).toHaveBeenCalledWith(
                'error',
                'No valid vote was submitted'
            );
            expect(voteService.castVote).not.toHaveBeenCalled();
        }
    );

    it('rejects a vote in a room the socket has not joined', async () => {
        await fake.trigger('vote', { ...payload, roomName: 'other' });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Join the room first'
        );
        expect(voteService.castVote).not.toHaveBeenCalled();
    });

    it('rejects a vote on a ticket outside the room', async () => {
        vi.mocked(ticketService.getTicketInRoom).mockRejectedValue(
            notFound('Ticket not found')
        );
        await fake.trigger('vote', payload);
        expect(voteService.castVote).not.toHaveBeenCalled();
        expect(fake.roomEmit).not.toHaveBeenCalled();
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
    beforeEach(() => {
        registerShowVotesHandler(fake.socket, fake.io);
        fake.socket.rooms.add('abc');
        vi.mocked(roomService.getRoomAsAdmin).mockResolvedValue(makeRoom());
    });

    it('saves the reveal and tells everyone in the room, including the sender', async () => {
        await fake.trigger('showVotes', { roomName: 'abc', ticketId: 1 });
        expect(roomService.getRoomAsAdmin).toHaveBeenCalledWith(
            'abc',
            'auth0|u'
        );
        expect(ticketService.revealVotes).toHaveBeenCalledWith('abc', 1);
        expect(fake.io.in).toHaveBeenCalledWith('abc');
        expect(fake.ioEmit).toHaveBeenCalledWith('showVotes', { ticketId: 1 });
    });

    it('only lets the room admin reveal votes', async () => {
        notAdmin();
        await fake.trigger('showVotes', { roomName: 'abc', ticketId: 1 });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Only the room admin can do that'
        );
        expect(fake.ioEmit).not.toHaveBeenCalled();
    });

    it('emits an error for a ticket outside the room', async () => {
        vi.mocked(ticketService.revealVotes).mockRejectedValue(
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
    beforeEach(() => {
        registerSetEstimateHandler(fake.socket, fake.io);
        fake.socket.rooms.add('abc');
        vi.mocked(roomService.getRoomAsAdmin).mockResolvedValue(makeRoom());
    });
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

    it('only lets the room admin set an estimate', async () => {
        notAdmin();
        await fake.trigger('setEstimate', { roomName: 'abc', currentTicket });
        expect(ticketService.setEstimate).not.toHaveBeenCalled();
        expect(fake.roomEmit).not.toHaveBeenCalled();
    });

    it('rejects a room the socket has not joined', async () => {
        await fake.trigger('setEstimate', { roomName: 'nope', currentTicket });
        expect(fake.socket.emit).toHaveBeenCalledWith(
            'error',
            'Join the room first'
        );
        expect(ticketService.setEstimate).not.toHaveBeenCalled();
    });
});
