import { usePokerSession } from '../../../context';
import { findNextTicket } from '../../../utils';

/** Facilitator-only actions for the current ticket */
const AdminPanel = () => {
    const {
        currentTicket,
        tickets,
        revealVotes,
        revote,
        nextTicket,
        deleteCurrentTicket,
        refinementMode,
    } = usePokerSession();

    if (!currentTicket) return null;

    const hasVotes = currentTicket.votes.length > 0;
    const hasNext = !!findNextTicket(tickets, currentTicket.ticket_id);

    const confirmRevote = () => {
        if (
            confirm(
                `Clear all votes on ${currentTicket.ticket_number} so everyone can vote again?`
            )
        ) {
            revote();
        }
    };

    return (
        <section className="admin-panel d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="small fw-semibold text-secondary text-uppercase">
                Ticket controls
            </span>
            <div className="d-flex flex-wrap gap-2">
                <button
                    className="btn btn-primary btn-sm"
                    onClick={revealVotes}
                >
                    Show Votes
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={confirmRevote}
                    disabled={!hasVotes}
                    title="Clear the votes on this ticket after discussion"
                >
                    Re-vote
                </button>
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={nextTicket}
                    disabled={!hasNext}
                    title="Move everyone to the next ticket still to vote on"
                >
                    Next ticket
                </button>
                {/* hidden while screen sharing, to avoid a mis-click */}
                {!refinementMode && (
                    <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={deleteCurrentTicket}
                    >
                        Delete Ticket
                    </button>
                )}
            </div>
        </section>
    );
};

export default AdminPanel;
