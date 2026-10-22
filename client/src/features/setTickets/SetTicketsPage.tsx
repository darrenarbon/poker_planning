import { useAuth0 } from '@auth0/auth0-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import NavBar from '../../components/NavBar';
import { useApi } from '../../hooks';
import { RoomRouteParams, roomVotingPath } from '../../routes';

const parseTicketList = (input: string): string[] =>
    input
        .split(',')
        .map((ticket) => ticket.trim())
        .filter((ticket) => ticket !== '');

const SetTicketsPage = () => {
    const { roomName } = useParams<RoomRouteParams>() as RoomRouteParams;
    const [ticketInput, setTicketInput] = useState('');
    const { user } = useAuth0();
    const [error, setError] = useState<string | null>(null);
    const api = useApi();
    const navigate = useNavigate();

    const saveTickets = async () => {
        setError(null);
        try {
            await api.saveTickets(roomName, parseTicketList(ticketInput));
            navigate(roomVotingPath(roomName));
        } catch (error) {
            console.error('Failed to save tickets:', error);
            setError('Could not save tickets. Please try again.');
        }
    };

    return (
        <main>
            <NavBar />
            {user && (
                <div className="container-fluid">
                    <h2>Set Tickets for Room {roomName}</h2>
                    <ErrorAlert
                        message={error}
                        onDismiss={() => setError(null)}
                    />
                    <p>
                        Enter a comma separated list of the ticket IDs in the
                        box below:
                    </p>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={ticketInput}
                        onChange={(e) => setTicketInput(e.target.value)}
                        placeholder="Enter ticket IDs here"
                    />
                    <button
                        className="btn btn-success mt-2"
                        onClick={saveTickets}
                    >
                        Save Tickets
                    </button>
                </div>
            )}
        </main>
    );
};

export default SetTicketsPage;
