import { Exemplar } from '../../../types';
import { ticketUrl } from '../../../utils';

type ExemplarTicketsProps = {
    exemplars: Exemplar[];
    baseUrl: string;
};

/** The room owner's example tickets, grouped by estimate, to calibrate votes */
const ExemplarTickets = ({ exemplars, baseUrl }: ExemplarTicketsProps) => {
    if (exemplars.length === 0) return null;

    const byEstimate = new Map<number, string[]>();
    for (const { estimate, ticketNumber } of [...exemplars].sort(
        (a, b) => a.estimate - b.estimate
    )) {
        byEstimate.set(estimate, [
            ...(byEstimate.get(estimate) ?? []),
            ticketNumber,
        ]);
    }

    return (
        <div className="exemplar-tickets mt-3">
            <div className="text-secondary small text-uppercase fw-semibold mb-2">
                What estimates look like
            </div>
            <dl className="d-flex flex-wrap gap-3 mb-0">
                {[...byEstimate].map(([estimate, tickets]) => (
                    <div
                        key={estimate}
                        className="d-flex align-items-center gap-2"
                    >
                        <dt className="badge text-bg-secondary">{estimate}</dt>
                        <dd className="mb-0 small">
                            {tickets.map((ticket, i) => (
                                <span key={ticket}>
                                    {i > 0 && ', '}
                                    <a
                                        href={ticketUrl(baseUrl, ticket)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {ticket}
                                    </a>
                                </span>
                            ))}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
};

export default ExemplarTickets;
