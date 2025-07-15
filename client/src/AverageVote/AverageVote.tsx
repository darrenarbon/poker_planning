import { TicketForVoting } from '../PokerSession/types';

type AverageVoteProps = {
    currentTicket: TicketForVoting;
};

const AverageVote = ({ currentTicket }: AverageVoteProps) => {
    if (
        !currentTicket ||
        !currentTicket.average_vote ||
        currentTicket.suggested_vote == null
    ) {
        return null;
    }

    const commonVote = Array.isArray(currentTicket.mode)
        ? currentTicket.mode.join(', ')
        : currentTicket.mode;

    return (
        <div className="text-center">
            <hr />
            <h5 className="text-center mb-3">
                Suggested Vote: {currentTicket.suggested_vote.vote}
                <br />
            </h5>
            <div
                className="alert w-50 d-inline-block alert-success"
                role="alert"
            >
                <h6>Why did we suggest this estimate?</h6>
                <p>{currentTicket.suggested_vote.rule}</p>
            </div>
            <h5 className="text-center mb-3">
                Most Common Vote: {commonVote}
                <br />
                Average Vote: {currentTicket.average_vote} &plusmn;{' '}
                {currentTicket.standard_deviation}
            </h5>
        </div>
    );
};

export default AverageVote;
