import { usePokerSession } from '../../../context';
import SetEstimate from './SetEstimate';

const AdminPanel = () => {
    const { currentTicket, revealVotes, deleteCurrentTicket, setEstimate } =
        usePokerSession();

    if (!currentTicket) return null;

    return (
        <div className="text-center mt-5">
            <button
                className="btn btn-primary btn-sm me-4"
                onClick={revealVotes}
            >
                Show Votes
            </button>
            <button
                className="btn btn-danger btn-sm"
                onClick={deleteCurrentTicket}
            >
                Delete Ticket
            </button>
            <hr />
            <SetEstimate
                chosenEstimate={currentTicket.chosen_estimate}
                onSetEstimate={setEstimate}
            />
        </div>
    );
};

export default AdminPanel;
