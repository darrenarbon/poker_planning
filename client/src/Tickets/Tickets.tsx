import { User } from '@auth0/auth0-react';
import { TicketForVoting } from '../PokerSession/types';
import Ticket from './Ticket';

type TicketsProps = {
    tickets: TicketForVoting[];
    selectTicket: (ticket: TicketForVoting) => void;
    currentTicket?: TicketForVoting | null;
    loggedInUser: User;
};

const Tickets = ({
    tickets,
    selectTicket,
    currentTicket,
    loggedInUser,
}: TicketsProps) => {
    return (
        <>
            <h4>Tickets</h4>
            {tickets.map((ticket) => (
                <Ticket
                    key={ticket.ticket_number}
                    ticket={ticket}
                    selectTicket={selectTicket}
                    currentTicket={currentTicket}
                    userSub={loggedInUser.sub}
                />
            ))}
        </>
    );
};

export default Tickets;
