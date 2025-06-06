import { TicketForVoting } from './types';

export const socket_voteReceived = (
    ticket: TicketForVoting,
    vote: number,
    userSub: string
) => {
    const voteForUser = ticket.votes.find((v) => v.usersub === userSub);

    if (voteForUser) {
        voteForUser.vote = vote;
    } else {
        ticket.votes.push({
            vote,
            usersub: userSub,
        });
    }
    return ticket;
};

export const socket_showVotes = (ticket: TicketForVoting) => {
    const sum = ticket.votes.reduce((acc, vote) => acc + vote.vote, 0);
    const totalVotes = ticket.votes.filter((v) => v.vote > 0).length;

    ticket.average_vote = parseFloat((sum / totalVotes).toFixed(2));

    if (totalVotes === 0 || totalVotes === 1) {
        ticket.standard_deviation = 0;
        return ticket;
    }

    ticket.standard_deviation = parseFloat(
        Math.sqrt(
            ticket.votes.reduce(
                (acc, vote) =>
                    acc + (vote.vote - (ticket.average_vote || 0)) ** 2,
                0
            ) / totalVotes
        ).toFixed(2)
    );
    return ticket;
};
