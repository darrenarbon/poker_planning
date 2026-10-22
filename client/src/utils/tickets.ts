import { TicketForVoting } from '../types';

/** Trims whitespace and any trailing slash so links can be built as `${base}/${ticket}` */
export const normaliseBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

/** Splits pasted ticket IDs on commas, whitespace or new lines, removing blanks */
export const parseTicketList = (input: string): string[] =>
    input
        .split(/[\s,;]+/)
        .map((ticket) => ticket.trim())
        .filter((ticket) => ticket !== '');

export const ticketUrl = (baseUrl: string, ticketNumber: string) =>
    `${normaliseBaseUrl(baseUrl)}/${ticketNumber}`;

/**
 * The ticket to move on to: the next one after the current ticket whose votes
 * have not been revealed, wrapping round to the start, or failing that simply
 * the next ticket in the list.
 */
export const findNextTicket = (
    tickets: TicketForVoting[],
    currentTicketId: string | undefined
): TicketForVoting | undefined => {
    const index = tickets.findIndex((t) => t.ticket_id === currentTicketId);
    const after = [...tickets.slice(index + 1), ...tickets.slice(0, index + 1)];
    return (
        after.find(
            (t) => !t.votes_revealed && t.ticket_id !== currentTicketId
        ) ?? (index + 1 < tickets.length ? tickets[index + 1] : undefined)
    );
};

/** A ticket with its votes and any estimate cleared, as after a re-vote. */
export const withVotesCleared = (ticket: TicketForVoting): TicketForVoting => ({
    ticket_id: ticket.ticket_id,
    ticket_number: ticket.ticket_number,
    archived_at: ticket.archived_at,
    votes: [],
    votes_revealed: false,
});

/** Groups archived tickets by the sprint they were archived with, newest first. */
export const groupBySprint = (tickets: TicketForVoting[]) => {
    const groups = new Map<string, TicketForVoting[]>();
    for (const ticket of tickets) {
        const key = ticket.archived_at ?? '';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(ticket);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([archivedAt, tickets]) => ({ archivedAt, tickets }));
};

/**
 * The tickets with one moved to a new position. `toIndex` is where it lands
 * in the list as it is now, so dropping onto its own slot changes nothing.
 */
export const moveTicket = (
    tickets: TicketForVoting[],
    ticketId: string,
    toIndex: number
): TicketForVoting[] => {
    const fromIndex = tickets.findIndex((t) => t.ticket_id === ticketId);
    if (fromIndex === -1) return tickets;
    const target = Math.max(
        0,
        Math.min(
            toIndex > fromIndex ? toIndex - 1 : toIndex,
            tickets.length - 1
        )
    );
    if (target === fromIndex) return tickets;
    const moved = [...tickets];
    const [ticket] = moved.splice(fromIndex, 1);
    moved.splice(target, 0, ticket);
    return moved;
};

/** The tickets sorted by the given ids; any not listed keep their place at the end. */
export const orderTickets = (
    tickets: TicketForVoting[],
    ticketIds: string[]
): TicketForVoting[] => {
    const position = new Map(ticketIds.map((id, i) => [String(id), i]));
    const rank = (t: TicketForVoting) =>
        position.get(String(t.ticket_id)) ?? ticketIds.length;
    return [...tickets].sort((a, b) => rank(a) - rank(b));
};
