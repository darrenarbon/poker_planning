import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import NavBar from '../NavBar';
import { useAuth0 } from '@auth0/auth0-react';

interface SetTicketsProps {
    roomName: string;
}

const SetTickets = ({ roomName }: SetTicketsProps) => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<string>('');
    const { user } = useAuth0();
    const { getAccessTokenSilently } = useAuth0();

    const saveTickets = async () => {
        const token = await getAccessTokenSilently();
        const ticketsArray = tickets.split(',');
        const trimmedTickets = ticketsArray.map((ticket) => ticket.trim());
        const ticketsToSave = trimmedTickets.filter((ticket) => ticket !== '');

        await fetch(`${config.apiUrl}/room/${roomName}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ ticketsToSave }),
        });

        navigate(`/room/${roomName}/voting`);
    };

    return (
        <main>
            <NavBar auth0User={user} />
            {user && (
                <div className="container-fluid">
                    <h2>Set Tickets for Room {roomName}</h2>
                    <p>
                        Enter a comma separated list of the ticket IDs in the
                        box below:
                    </p>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={tickets}
                        onChange={(e) => setTickets(e.target.value)}
                        placeholder="Enter ticket IDs here"
                    />
                    <button
                        className="btn btn-success mt-2"
                        onClick={() => saveTickets()}
                    >
                        Save Tickets
                    </button>
                </div>
            )}
        </main>
    );
};

export default SetTickets;
