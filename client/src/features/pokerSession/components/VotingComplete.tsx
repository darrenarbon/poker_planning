import { TicketForVoting } from '../../../types';
import VoteSummary from './VoteSummary';

type VotingCompleteProps = {
    ticket: TicketForVoting;
};

const VotingComplete = ({ ticket }: VotingCompleteProps) => (
    <>
        <section className="card dashboard-card text-center">
            <div className="card-body p-4">
                <div className="text-success small text-uppercase fw-semibold">
                    Voting complete
                </div>
                <h2 className="h3 fw-bold">{ticket.ticket_number}</h2>
                <div className="text-secondary">Final estimate</div>
                <div className="final-estimate">{ticket.chosen_estimate}</div>
            </div>
        </section>
        <VoteSummary ticket={ticket} />
    </>
);

export default VotingComplete;
