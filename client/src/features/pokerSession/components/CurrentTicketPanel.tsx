import { usePokerSession } from '../../../context';
import { useConsensusConfetti } from '../../../hooks';
import AdminPanel from './AdminPanel';
import DiscussionTimer from './DiscussionTimer';
import PlayersPanel from './PlayersPanel';
import VoteSummary from './VoteSummary';
import VotingComplete from './VotingComplete';
import VotingPanel from './VotingPanel';

const CurrentTicketPanel = () => {
    const { currentTicket, isAdmin, showVotes } = usePokerSession();
    useConsensusConfetti(currentTicket, showVotes);

    if (!currentTicket) {
        return (
            <div className="card dashboard-card text-center p-5">
                <h2 className="h5 fw-bold">Select a ticket to start voting</h2>
                <p className="text-secondary mb-0">
                    Pick a ticket from the list to begin estimating.
                </p>
            </div>
        );
    }

    const isComplete = !!currentTicket.chosen_estimate && !isAdmin;

    return (
        <div className="row g-4">
            <div className="col-lg-8 d-flex flex-column gap-3">
                {isAdmin && <AdminPanel />}
                <DiscussionTimer />
                {isComplete ? (
                    <VotingComplete ticket={currentTicket} />
                ) : (
                    <VotingPanel />
                )}
                {showVotes && !isComplete && (
                    <VoteSummary ticket={currentTicket} />
                )}
            </div>
            <div className="col-lg-4">
                <PlayersPanel />
            </div>
        </div>
    );
};

export default CurrentTicketPanel;
