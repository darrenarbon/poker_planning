import classNames from 'classnames';
import { TicketForVoting, VoteModel } from '../../PokerSession/types';

interface TicketProps {
    ticket: TicketForVoting;
    selectTicket: (ticket: TicketForVoting) => void;
    currentTicket?: TicketForVoting | null;
    userSub: string | undefined;
    ticketBaseUrl: string;
}

const Ticket = ({
    ticket,
    selectTicket,
    currentTicket,
    userSub,
    ticketBaseUrl,
}: TicketProps) => {
    const getMyVote = () => {
        const vote = ticket.votes.find((v: VoteModel) => v.usersub === userSub);
        return vote ? vote.vote : null;
    };

    const getStatus = () => {
        if (ticket.chosen_estimate) {
            return `Estimated: ${ticket.chosen_estimate}`;
        } else if (getMyVote()) {
            return `Voted: ${getMyVote()}`;
        }
        return 'Not voted yet';
    };
    return (
        <div
            className={classNames('card border-success mb-2', {
                'bg-success-subtle': ticket === currentTicket,
            })}
            key={ticket.ticket_number}
            style={{ cursor: 'pointer' }}
            onClick={() => selectTicket(ticket)}
        >
            <div className="card-header text-center fw-bold">
                {ticket.ticket_number}
            </div>
            <div className="card-body">
                <span className="fw-bold">Status:</span> {getStatus()}
                <br />
                <a
                    href={`${ticketBaseUrl}/${ticket.ticket_number}`}
                    target="_blank"
                >
                    View Ticket
                </a>
            </div>
        </div>
    );
};

export default Ticket;
