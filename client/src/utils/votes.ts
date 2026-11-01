import { TicketForVoting } from '../types';

export const findVote = (
    ticket: TicketForVoting,
    userSub: string | undefined
): number | null =>
    ticket.votes.find((v) => v.usersub === userSub)?.vote ?? null;

/** Returns a copy of the ticket with the user's vote added or replaced */
export const withVote = (
    ticket: TicketForVoting,
    vote: number,
    userSub: string | undefined
): TicketForVoting => {
    const hasVoted = ticket.votes.some((v) => v.usersub === userSub);
    return {
        ...ticket,
        votes: hasVoted
            ? ticket.votes.map((v) =>
                  v.usersub === userSub ? { ...v, vote } : v
              )
            : [...ticket.votes, { vote, usersub: userSub }],
    };
};

export const replaceTicket = (
    tickets: TicketForVoting[],
    updated: TicketForVoting
): TicketForVoting[] =>
    tickets.map((t) => (t.ticket_id === updated.ticket_id ? updated : t));
