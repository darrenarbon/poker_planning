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
    const [tickets, setTickets] = useState<string[]>(['']);
    const { user } = useAuth0();

    const saveTickets = async () => {
        const trimmedTickets = tickets.map((ticket) => ticket.trim());
        const ticketsToSave = trimmedTickets.filter((ticket) => ticket !== '');

        await fetch(`${config.apiUrl}/room/${roomName}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

                    <div className="row">
                        {tickets.map((ticket, index) => (
                            <div className="col-3" key={index}>
                                <div className="form-group text-start">
                                    <label htmlFor={`ticket${index}`}>
                                        Ticket ID:{' '}
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id={`ticket${index}`}
                                        value={ticket}
                                        onChange={(e) =>
                                            setTickets((prevTickets) => {
                                                const newTickets = [
                                                    ...prevTickets,
                                                ];
                                                newTickets[index] =
                                                    e.target.value;
                                                return newTickets;
                                            })
                                        }
                                        placeholder="Enter a ticket ID"
                                        required
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        className="btn btn-primary mt-2 mx-2"
                        onClick={() =>
                            setTickets((prevTickets) => {
                                return [...prevTickets, ''];
                            })
                        }
                    >
                        Add New Ticket
                    </button>
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
