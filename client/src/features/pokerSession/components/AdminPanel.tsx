import { usePokerSession } from '../../../context';

/** Facilitator-only actions for the current ticket */
const AdminPanel = () => {
    const { currentTicket, revealVotes, deleteCurrentTicket } =
        usePokerSession();

    if (!currentTicket) return null;

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
                    className="btn btn-outline-danger btn-sm"
                    onClick={deleteCurrentTicket}
                >
                    Delete Ticket
                </button>
            </div>
        </section>
    );
};

export default AdminPanel;
