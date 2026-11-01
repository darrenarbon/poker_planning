import { useAuth0 } from '@auth0/auth0-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useApi } from '../../hooks';
import { RoomRouteParams, roomVotingPath } from '../../routes';
import { Room } from '../../types';
import { normaliseBaseUrl, parseTicketList, ticketUrl } from '../../utils';

const EXAMPLE_TICKET = 'ABC-123';

const SetTicketsPage = () => {
    const { roomName } = useParams<RoomRouteParams>() as RoomRouteParams;
    const { user } = useAuth0();
    const api = useApi();
    const navigate = useNavigate();

    const [room, setRoom] = useState<Room>();
    const [existingTickets, setExistingTickets] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [baseUrl, setBaseUrl] = useState('');
    const [ticketInput, setTicketInput] = useState('');
    const [removed, setRemoved] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        api.getRoom(roomName)
            .then(({ room, tickets }) => {
                if (cancelled) return;
                setRoom(room);
                setBaseUrl(room.ticketBaseUrl ?? '');
                setExistingTickets(tickets.map((t) => t.ticket_number));
            })
            .catch((e) => {
                console.error('Failed to load room:', e);
                if (!cancelled) {
                    setError('Could not load the room details.');
                }
            })
            .finally(() => !cancelled && setLoaded(true));
        return () => {
            cancelled = true;
        };
    }, [api, roomName, user]);

    const parsed = useMemo(() => parseTicketList(ticketInput), [ticketInput]);
    const unique = useMemo(() => [...new Set(parsed)], [parsed]);
    const alreadyInRoom = unique.filter((t) => existingTickets.includes(t));
    const tickets = unique.filter(
        (t) => !removed.includes(t) && !existingTickets.includes(t)
    );
    const duplicateCount = parsed.length - unique.length;

    const trimmedBaseUrl = normaliseBaseUrl(baseUrl);
    const baseUrlChanged =
        !!room && trimmedBaseUrl !== normaliseBaseUrl(room.ticketBaseUrl ?? '');
    const exampleLink = ticketUrl(trimmedBaseUrl, tickets[0] ?? EXAMPLE_TICKET);

    const save = async (e: FormEvent) => {
        e.preventDefault();
        if (!trimmedBaseUrl) {
            setError('Please enter a base URL for ticket links.');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            if (baseUrlChanged) {
                await api.updateBaseUrl(roomName, trimmedBaseUrl);
            }
            if (tickets.length) {
                await api.saveTickets(roomName, tickets);
            }
            navigate(roomVotingPath(roomName));
        } catch (error) {
            console.error('Failed to save tickets:', error);
            setError('Could not save tickets. Please try again.');
            setSaving(false);
        }
    };

    const renderContent = () => {
        if (!loaded) return <Loading />;

        return (
            <form onSubmit={save} className="set-tickets mx-auto">
                <header className="mb-4">
                    <div className="text-secondary small text-uppercase fw-semibold">
                        Room setup
                    </div>
                    <h1 className="h3 fw-bold mb-1">
                        Add tickets to {room?.friendlyName ?? 'your room'}
                    </h1>
                    <div className="d-flex align-items-center gap-2 small text-secondary">
                        Room ID <code className="room-id-pill">{roomName}</code>
                    </div>
                </header>

                <ErrorAlert message={error} onDismiss={() => setError(null)} />

                <section className="card dashboard-card mb-4">
                    <div className="card-body p-4">
                        <h2 className="h6 fw-bold">Ticket links</h2>
                        <p className="text-secondary small">
                            Check this is right: every ticket links to this URL
                            followed by its ID.
                        </p>
                        <label htmlFor="baseUrl" className="form-label">
                            Base URL for tickets
                        </label>
                        <input
                            id="baseUrl"
                            type="url"
                            className="form-control"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://your-company.atlassian.net/browse"
                        />
                        {trimmedBaseUrl && (
                            <div className="form-text">
                                Example link:{' '}
                                <a
                                    href={exampleLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {exampleLink}
                                </a>{' '}
                                (opens in a new tab so you can check it)
                            </div>
                        )}
                    </div>
                </section>

                <section className="card dashboard-card mb-4">
                    <div className="card-body p-4">
                        <h2 className="h6 fw-bold">Tickets</h2>
                        <p className="text-secondary small">
                            Paste ticket IDs separated by commas, spaces or new
                            lines. You can add more later from the voting
                            screen.
                        </p>
                        <label htmlFor="tickets" className="form-label">
                            Ticket IDs
                        </label>
                        <textarea
                            id="tickets"
                            className="form-control font-monospace"
                            rows={4}
                            value={ticketInput}
                            onChange={(e) => {
                                setTicketInput(e.target.value);
                                setRemoved([]);
                            }}
                            placeholder={'ABC-101, ABC-102\nABC-103'}
                        />

                        {unique.length > 0 && (
                            <div className="mt-3">
                                <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2 mb-2">
                                    <span className="small fw-semibold">
                                        {tickets.length}{' '}
                                        {tickets.length === 1
                                            ? 'ticket'
                                            : 'tickets'}{' '}
                                        to add
                                    </span>
                                    <span className="small text-secondary">
                                        {duplicateCount > 0 &&
                                            `${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} ignored. `}
                                        {alreadyInRoom.length > 0 &&
                                            `Already in room: ${alreadyInRoom.join(', ')}.`}
                                    </span>
                                </div>
                                <ul className="list-unstyled d-flex flex-wrap gap-2 mb-0">
                                    {tickets.map((ticket) => (
                                        <li
                                            key={ticket}
                                            className="ticket-chip"
                                        >
                                            <a
                                                href={ticketUrl(
                                                    trimmedBaseUrl,
                                                    ticket
                                                )}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {ticket}
                                            </a>
                                            <button
                                                type="button"
                                                className="btn-close"
                                                aria-label={`Remove ${ticket}`}
                                                onClick={() =>
                                                    setRemoved((r) => [
                                                        ...r,
                                                        ticket,
                                                    ])
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {existingTickets.length > 0 && (
                            <p className="small text-secondary mt-3 mb-0">
                                This room already has {existingTickets.length}{' '}
                                {existingTickets.length === 1
                                    ? 'ticket'
                                    : 'tickets'}
                                .
                            </p>
                        )}
                    </div>
                </section>

                <div className="d-flex flex-wrap justify-content-end gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate(roomVotingPath(roomName))}
                        disabled={saving}
                    >
                        Skip for now
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                            saving || (!tickets.length && !baseUrlChanged)
                        }
                    >
                        {saving
                            ? 'Saving…'
                            : tickets.length
                              ? `Save ${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'} and start`
                              : 'Save and start'}
                    </button>
                </div>
            </form>
        );
    };

    return (
        <main>
            <NavBar />
            {user && <div className="container py-4">{renderContent()}</div>}
        </main>
    );
};

export default SetTicketsPage;
