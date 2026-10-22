import { usePokerSession } from '../../../context';
import AdminPanel from './AdminPanel';
import VoteSummary from './VoteSummary';
import VotingComplete from './VotingComplete';
import VotingPanel from './VotingPanel';

const CurrentTicketPanel = () => {
    const { currentTicket, isAdmin, showVotes } = usePokerSession();

    if (!currentTicket) {
        return <h4 className="text-center">Select a ticket to start voting</h4>;
    }

    const isComplete = !!currentTicket.chosen_estimate && !isAdmin;

    return (
        <>
            {isComplete ? (
                <VotingComplete ticket={currentTicket} />
            ) : (
                <VotingPanel />
            )}
            {showVotes && <VoteSummary ticket={currentTicket} />}
            {isAdmin && <AdminPanel />}
        </>
    );
};

export default CurrentTicketPanel;
