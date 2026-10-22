import { TicketForVoting } from '../../../types';
import VoteSummary from './VoteSummary';

type VotingCompleteProps = {
    ticket: TicketForVoting;
};

const VotingComplete = ({ ticket }: VotingCompleteProps) => (
    <>
        <h4 className="text-center pb-4">
            Voting on ticket: {ticket.ticket_number} is complete
        </h4>
        <h5 className="text-center">
            Final Estimate: {ticket.chosen_estimate}
        </h5>
        <VoteSummary ticket={ticket} />
    </>
);

export default VotingComplete;
