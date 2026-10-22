import Tooltip from '../../../components/Tooltip';
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
                <Tooltip text="Reveals everyone's votes on this ticket, with the average and a suggested estimate.">
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={revealVotes}
                    >
                        Show Votes
                    </button>
                </Tooltip>
                <Tooltip text="Clears all votes on this ticket and hides them again, so everyone can vote afresh after discussion.">
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={confirmRevote}
                        disabled={!hasVotes}
                    >
                        Re-vote
                    </button>
                </Tooltip>
                <Tooltip
                    text={
                        refinementMode
                            ? 'Moves everyone to the next ticket whose votes have not been shown.'
                            : 'Goes to the next ticket whose votes have not been shown. Turn on refinement mode to bring everyone with you.'
                    }
                >
                    <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={nextTicket}
                        disabled={!hasNext}
                    >
                        Next ticket
                    </button>
                </Tooltip>
                {/* hidden while screen sharing, to avoid a mis-click */}
                {!refinementMode && (
                    <Tooltip text="Permanently deletes this ticket and its votes.">
                        <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={deleteCurrentTicket}
                        >
                            Delete Ticket
                        </button>
                    </Tooltip>
                )}
            </div>
        </section>
    );
};

export default AdminPanel;
