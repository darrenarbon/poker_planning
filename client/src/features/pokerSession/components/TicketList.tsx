import { usePokerSession } from '../../../context';
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
    } = usePokerSession();

    const promptForTicket = () => {
        const ticketNumber = prompt('Enter new ticket number:');
        if (ticketNumber) {
            addTicket(ticketNumber);
        }
    };

    return (
        <>
            <h4 className="text-center">Tickets</h4>
            {isAdmin && (
                <div className="text-center mb-3">
                    <button
                        className="btn btn-primary btn-sm mt-3"
                        onClick={promptForTicket}
                    >
                        Add New Ticket
                    </button>
                </div>
            )}
            {tickets.map((ticket) => (
                <TicketCard
                    key={ticket.ticket_number}
                    ticket={ticket}
                    isSelected={ticket.ticket_id === currentTicket?.ticket_id}
                    onSelect={selectTicket}
                    userSub={user?.sub}
                    ticketBaseUrl={room?.ticketBaseUrl ?? ''}
                />
            ))}
        </>
    );
};

export default TicketList;
