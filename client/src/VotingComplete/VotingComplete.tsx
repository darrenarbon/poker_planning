import AverageVote from '../AverageVote';
import { TicketForVoting } from '../PokerSession/types';

interface VotingCompleteProps {
    currentTicket: TicketForVoting;
}

const VotingComplete = ({ currentTicket }: VotingCompleteProps) => {
    return (
        <>
            <h4 className="text-center pb-4">
                Voting on ticket: {currentTicket.ticket_number} is complete
            </h4>
            <h5 className="text-center">
                Final Estimate: {currentTicket.chosen_estimate}
            </h5>
            <AverageVote currentTicket={currentTicket} />
        </>
    );
};

export default VotingComplete;
