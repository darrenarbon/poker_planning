import { useState } from 'react';
import { usePokerSession } from '../../../context';
import { groupBySprint, ticketUrl } from '../../../utils';

const formatDate = (iso: string) =>
    iso
        ? new Date(iso).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : 'Unknown date';

/** Tickets archived when each new sprint started, grouped by sprint */
const PastSprints = () => {
    const { archivedTickets, room } = usePokerSession();
    const [open, setOpen] = useState(false);

    if (archivedTickets.length === 0) return null;

    return (
        <section className="past-sprints mt-4">
            <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                {open ? '▾' : '▸'} Past sprints ({archivedTickets.length})
            </button>
            {open &&
                groupBySprint(archivedTickets).map(
                    ({ archivedAt, tickets }) => (
                        <div key={archivedAt} className="mt-2">
                            <div className="small text-secondary">
                                Archived {formatDate(archivedAt)}
                            </div>
                            <ul className="list-unstyled small mb-0">
                                {tickets.map((ticket) => (
                                    <li
                                        key={ticket.ticket_id}
                                        className="d-flex justify-content-between"
                                    >
                                        <a
                                            href={ticketUrl(
                                                room?.ticketBaseUrl ?? '',
                                                ticket.ticket_number
                                            )}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {ticket.ticket_number}
                                        </a>
                                        <span className="text-secondary">
                                            {ticket.votes.length} votes
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                )}
        </section>
    );
};

export default PastSprints;
