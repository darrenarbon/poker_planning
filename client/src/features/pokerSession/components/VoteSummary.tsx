import { TicketForVoting } from '../../../types';

type VoteSummaryProps = {
    ticket: TicketForVoting;
};

type StatProps = { label: string; value: string | number; detail?: string };

const Stat = ({ label, value, detail }: StatProps) => (
    <div className="vote-stat">
        <div className="vote-stat-label">{label}</div>
        <div className="vote-stat-value">
            {value}
            {detail && <span className="vote-stat-detail"> {detail}</span>}
        </div>
    </div>
);

/** Suggested estimate plus mode / average stats, once votes have been revealed */
const VoteSummary = ({ ticket }: VoteSummaryProps) => {
    if (ticket.average_vote == null || ticket.suggested_vote == null) {
        return null;
    }

    const commonVote = Array.isArray(ticket.mode)
        ? ticket.mode.join(', ')
        : ticket.mode;

    return (
        <section className="card dashboard-card">
            <div className="card-body p-3">
                <div className="vote-stats">
                    <Stat
                        label="Suggested vote"
                        value={ticket.suggested_vote.vote}
                    />
                    <Stat label="Most common vote" value={commonVote ?? '–'} />
                    <Stat
                        label="Average vote"
                        value={ticket.average_vote}
                        detail={`± ${ticket.standard_deviation}`}
                    />
                </div>
                <p className="vote-reason small mb-0 mt-2">
                    <span className="fw-semibold">
                        Why did we suggest this estimate?
                    </span>{' '}
                    {ticket.suggested_vote.rule}
                </p>
            </div>
        </section>
    );
};

export default VoteSummary;
