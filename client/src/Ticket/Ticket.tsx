import classNames from 'classnames';
import { TicketForVoting, VoteModel } from '../PokerSession/types';

interface TicketProps {
    ticket: TicketForVoting;
    selectTicket: (ticket: TicketForVoting) => void;
    currentTicket?: TicketForVoting | null;
    userSub: string | undefined;
    adminId?: number;
}

const Ticket = ({
    ticket,
    selectTicket,
    currentTicket,
    userSub,
    adminId,
}: TicketProps) => {
    const getMyVote = () => {
        const vote = ticket.votes.find((v: VoteModel) => v.userSub === userSub);
        return vote ? vote.vote : null;
    };

    return (
        <div
            className="col-12 col-sm-6 col-md-4 col-lg-3 p-1"
            key={ticket.ticketNumber}
        >
            <div
                className={classNames('card border-success', {
                    'bg-success-subtle': ticket === currentTicket,
                })}
            >
                <div className="card-header">
                    <span className="fw-bold">Ticket: </span>
                    <a href={ticket.ticketUrl} target="_blank">
                        {ticket.ticketNumber}
                    </a>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-7 fw-bold text-start">My vote:</div>
                        <div className="col-5">{getMyVote()}</div>
                        <div className="col-7 fw-bold text-start">
                            Average vote:
                        </div>
                        <div className="col-5">
                            {' '}
                            {ticket.averageVote && (
                                <>
                                    {ticket.averageVote} &plusmn;{' '}
                                    {ticket.standardDeviation}
                                </>
                            )}
                        </div>
                        <div className="col-7 fw-bold text-start">
                            Chosen points:
                        </div>
                        <div className="col-5">{ticket.chosenEstimate}</div>
                    </div>
                    {currentTicket === ticket && (
                        <button className="btn btn-primary btn-sm" disabled>
                            Selected
                        </button>
                    )}
                    {currentTicket !== ticket && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => selectTicket(ticket)}
                        >
                            Select
                        </button>
                    )}
                    {adminId === userSub && (
                        <button className="btn btn-danger btn-sm ms-2">
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Ticket;
