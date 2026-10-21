import { TicketForVoting } from '../../../types';

type VoteSummaryProps = {
    ticket: TicketForVoting;
};

/** Suggested estimate plus mode / average stats, once votes have been revealed */
const VoteSummary = ({ ticket }: VoteSummaryProps) => {
    if (!ticket.average_vote || ticket.suggested_vote == null) {
        return null;
    }

    const commonVote = Array.isArray(ticket.mode)
        ? ticket.mode.join(', ')
        : ticket.mode;

    return (
        <div className="text-center">
            <hr />
            <h5 className="text-center mb-3">
                Suggested Vote: {ticket.suggested_vote.vote}
                <br />
            </h5>
            <div
                className="alert w-50 d-inline-block alert-success"
                role="alert"
            >
                <h6>Why did we suggest this estimate?</h6>
                <p>{ticket.suggested_vote.rule}</p>
            </div>
            <h5 className="text-center mb-3">
                Most Common Vote: {commonVote}
                <br />
                Average Vote: {ticket.average_vote} &plusmn;{' '}
                {ticket.standard_deviation}
            </h5>
        </div>
    );
};

export default VoteSummary;
