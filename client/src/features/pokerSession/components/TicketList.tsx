import { usePokerSession } from '../../../context';
import { findVote } from '../../../utils';
import TicketCard from './TicketCard';

const TicketList = () => {
    const {
        tickets,
        currentTicket,
        selectTicket,
        isAdmin,
        addTicket,
        user,
        room,
        refinementMode,
    } = usePokerSession();

    const promptForTicket = () => {
        const ticketNumber = prompt('Enter new ticket number:');
        if (ticketNumber) {
            addTicket(ticketNumber);
        }
    };

    const votedCount = tickets.filter(
        (t) => findVote(t, user?.sub) !== null
    ).length;

    return (
        <>
            <div className="d-flex align-items-baseline justify-content-between mb-3">
                <h2 className="h6 fw-bold mb-0">Tickets</h2>
                {tickets.length > 0 && (
                    <span className="text-secondary small">
                        {votedCount}/{tickets.length} voted
                    </span>
                )}
            </div>
            {isAdmin && (
                <button
                    className="btn btn-primary btn-sm w-100 mb-3"
                    onClick={promptForTicket}
                >
                    Add New Ticket
                </button>
            )}
            {tickets.length === 0 && (
                <p className="text-secondary small">No tickets yet.</p>
            )}
            {tickets.map((ticket) => (
                <TicketCard
                    key={ticket.ticket_number}
                    ticket={ticket}
                    isSelected={ticket.ticket_id === currentTicket?.ticket_id}
                    onSelect={selectTicket}
                    userSub={user?.sub}
                    hideMyVote={refinementMode && !ticket.votes_revealed}
                    ticketBaseUrl={room?.ticketBaseUrl ?? ''}
                />
            ))}
        </>
    );
};

export default TicketList;
