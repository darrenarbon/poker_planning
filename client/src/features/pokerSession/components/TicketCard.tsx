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
    /** refinement mode: say "Voted" without the value */
    hideMyVote?: boolean;
};

type Status = { text: string; badge: string };

const getStatus = (
    ticket: TicketForVoting,
    myVote: number | null,
    hideMyVote: boolean
): Status => {
    if (ticket.chosen_estimate) {
        return {
            text: `Estimated: ${ticket.chosen_estimate}`,
            badge: 'text-bg-success',
        };
    }
    if (myVote !== null) {
        return {
            text: hideMyVote
                ? 'Voted'
                : `Voted: ${myVote === NO_IDEA_VOTE ? 'No Idea' : myVote}`,
            badge: 'text-bg-primary',
        };
    }
    return { text: 'Not voted yet', badge: 'bg-body-secondary text-secondary' };
};

const TicketCard = ({
    ticket,
    isSelected,
    onSelect,
    userSub,
    ticketBaseUrl,
    hideMyVote = false,
}: TicketCardProps) => {
    const status = getStatus(ticket, findVote(ticket, userSub), hideMyVote);

    return (
        <div
            className={classNames('card ticket-card mb-2', {
                selected: isSelected,
            })}
            role="button"
            aria-current={isSelected || undefined}
            tabIndex={0}
            onClick={() => onSelect(ticket)}
            onKeyDown={(e) => {
                // the inner link handles its own keys
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(ticket);
                }
            }}
        >
            <div className="card-body py-2 px-3">
                <div className="d-flex justify-content-between align-items-center gap-2">
                    <span className="fw-bold">{ticket.ticket_number}</span>
                    <a
                        className="small"
                        href={`${ticketBaseUrl}/${ticket.ticket_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View Ticket
                    </a>
                </div>
                <span className={`badge rounded-pill mt-1 ${status.badge}`}>
                    {status.text}
                </span>
            </div>
        </div>
    );
};

export default TicketCard;
