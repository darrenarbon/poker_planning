import classNames from 'classnames';
import { NO_IDEA_VOTE } from '../../../constants';
import { TicketForVoting } from '../../../types';
import { findVote } from '../../../utils';

type TicketCardProps = {
    ticket: TicketForVoting;
    isSelected: boolean;
    onSelect: (ticket: TicketForVoting) => void;
    userSub: string | undefined;
    ticketBaseUrl: string;
};

const getStatus = (ticket: TicketForVoting, myVote: number | null): string => {
    if (ticket.chosen_estimate) {
        return `Estimated: ${ticket.chosen_estimate}`;
    }
    if (myVote !== null) {
        return `Voted: ${myVote === NO_IDEA_VOTE ? 'No Idea' : myVote}`;
    }
    return 'Not voted yet';
};

const TicketCard = ({
    ticket,
    isSelected,
    onSelect,
    userSub,
    ticketBaseUrl,
}: TicketCardProps) => (
    <div
        className={classNames('card border-success mb-2', {
            'bg-success-subtle': isSelected,
        })}
        style={{ cursor: 'pointer' }}
        onClick={() => onSelect(ticket)}
    >
        <div className="card-header text-center fw-bold">
            {ticket.ticket_number}
        </div>
        <div className="card-body">
            <span className="fw-bold">Status:</span>{' '}
            {getStatus(ticket, findVote(ticket, userSub))}
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

export default TicketCard;
