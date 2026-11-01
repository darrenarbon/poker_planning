import classNames from 'classnames';
import { DragEvent, FormEvent, KeyboardEvent, useState } from 'react';
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
        moveTicket,
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

    // drag and drop: the ticket being dragged and the gap it would drop into
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    const endDrag = () => {
        setDraggingId(null);
        setDropIndex(null);
    };

    const dragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
        if (draggingId === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const below = e.clientY > rect.top + rect.height / 2;
        setDropIndex(below ? index + 1 : index);
    };

    const drop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (draggingId !== null && dropIndex !== null) {
            moveTicket(draggingId, dropIndex);
        }
        endDrag();
    };

    // keyboard alternative: Alt + Up / Down moves the focused ticket
    const moveWithKeys = (
        e: KeyboardEvent<HTMLDivElement>,
        ticketId: string,
        index: number
    ) => {
        if (!e.altKey) return;
        if (e.key === 'ArrowUp' && index > 0) {
            e.preventDefault();
            moveTicket(ticketId, index - 1);
        } else if (e.key === 'ArrowDown' && index < tickets.length - 1) {
            e.preventDefault();
            moveTicket(ticketId, index + 2);
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
            {isAdmin && tickets.length > 1 && (
                <p className="text-secondary small mb-2">
                    Drag tickets to reorder, or use Alt + ↑/↓.
                </p>
            )}
            {tickets.map((ticket, index) => {
                const card = (
                    <TicketCard
                        ticket={ticket}
                        isSelected={
                            ticket.ticket_id === currentTicket?.ticket_id
                        }
                        onSelect={selectTicket}
                        userSub={user?.sub}
                        hideMyVote={refinementMode && !ticket.votes_revealed}
                        ticketBaseUrl={room?.ticketBaseUrl ?? ''}
                    />
                );
                if (!isAdmin) {
                    return <div key={ticket.ticket_number}>{card}</div>;
                }
                return (
                    <div
                        key={ticket.ticket_number}
                        data-testid="ticket-drag-item"
                        className={classNames('ticket-drag-item', {
                            dragging: ticket.ticket_id === draggingId,
                            'drop-before': dropIndex === index,
                            'drop-after':
                                dropIndex === index + 1 &&
                                index === tickets.length - 1,
                        })}
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData(
                                'text/plain',
                                ticket.ticket_number
                            );
                            setDraggingId(ticket.ticket_id);
                        }}
                        onDragOver={(e) => dragOver(e, index)}
                        onDrop={drop}
                        onDragEnd={endDrag}
                        onKeyDown={(e) =>
                            moveWithKeys(e, ticket.ticket_id, index)
                        }
                    >
                        {card}
                    </div>
                );
            })}
            <PastSprints />
        </>
    );
};

export default TicketList;
