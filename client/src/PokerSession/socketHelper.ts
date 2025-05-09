import { TicketForVoting } from './types';

export const socket_voteReceived = (
    ticket: TicketForVoting,
    vote: number,
    userSub: string
) => {
    const voteForUser = ticket.votes.find((v) => v.userSub === userSub);

    if (voteForUser) {
        voteForUser.vote = vote;
    } else {
        ticket.votes.push({
            vote,
            userSub: userSub,
        });
    }
    return ticket;
};

export const socket_showVotes = (ticket: TicketForVoting) => {
    const sum = ticket.votes.reduce((acc, vote) => acc + vote.vote, 0);

    ticket.average_vote = parseFloat((sum / ticket.votes.length).toFixed(2));

    ticket.standard_deviation = parseFloat(
        Math.sqrt(
            ticket.votes.reduce(
                (acc, vote) =>
                    acc + (vote.vote - (ticket.average_vote || 0)) ** 2,
                0
            ) / ticket.votes.length
        ).toFixed(2)
    );
    return ticket;
};
