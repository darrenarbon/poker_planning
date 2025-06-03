import { User } from '@auth0/auth0-react';
import { TicketForVoting } from '../PokerSession/types';
import Ticket from './Ticket';

type TicketsProps = {
    tickets: TicketForVoting[];
    selectTicket: (ticket: TicketForVoting) => void;
    currentTicket?: TicketForVoting | null;
    loggedInUser: User;
    isAdmin: boolean;
    addNewTicket: (ticketNumber: string) => void;
    ticketBaseUrl: string;
};

const Tickets = ({
    tickets,
    selectTicket,
    currentTicket,
    loggedInUser,
    isAdmin,
    addNewTicket,
    ticketBaseUrl,
}: TicketsProps) => {
    const addTicket = () => {
        const ticketNumber = prompt('Enter new ticket number:');
        if (ticketNumber) {
            addNewTicket(ticketNumber);
        }
    };

    return (
        <>
            <h4 className="text-center">Tickets</h4>
            {isAdmin && (
                <div className="text-center mb-3">
                    <button
                        className="btn btn-primary btn-sm mt-3"
                        onClick={addTicket}
                    >
                        Add New Ticket
                    </button>
                </div>
            )}
            {tickets.map((ticket) => (
                <Ticket
                    key={ticket.ticket_number}
                    ticket={ticket}
                    selectTicket={selectTicket}
                    currentTicket={currentTicket}
                    userSub={loggedInUser.sub}
                    ticketBaseUrl={ticketBaseUrl}
                />
            ))}
        </>
    );
};

export default Tickets;
