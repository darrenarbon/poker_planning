import { FormEvent, useState } from 'react';
import { usePokerSession } from '../../../context';
import { findVote } from '../../../utils';
import PastSprints from './PastSprints';
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

    const [adding, setAdding] = useState(false);
    const [ticketNumber, setTicketNumber] = useState('');

    const closeAddForm = () => {
        setAdding(false);
        setTicketNumber('');
    };

    const submitTicket = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = ticketNumber.trim();
        if (!trimmed) return;
        addTicket(trimmed);
        closeAddForm();
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
            {isAdmin &&
                (adding ? (
                    <form className="mb-3" onSubmit={submitTicket}>
                        <label
                            htmlFor="newTicketNumber"
                            className="form-label small mb-1"
                        >
                            New ticket number
                        </label>
                        <input
                            id="newTicketNumber"
                            className="form-control form-control-sm mb-2"
                            value={ticketNumber}
                            onChange={(e) => setTicketNumber(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Escape' && closeAddForm()
                            }
                            placeholder="e.g. ABC-123"
                            autoFocus
                        />
                        <div className="d-flex gap-2">
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm flex-fill"
                                disabled={!ticketNumber.trim()}
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm flex-fill"
                                onClick={closeAddForm}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        className="btn btn-primary btn-sm w-100 mb-3"
                        onClick={() => setAdding(true)}
                    >
                        Add New Ticket
                    </button>
                ))}
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
            <PastSprints />
        </>
    );
};

export default TicketList;
