import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SetTicketsProps {
  roomName: string;
}

const SetTickets = ({ roomName }: SetTicketsProps) => {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [tickets, setTickets] = useState<string[]>(['']);

  const saveTickets = async () => {
    const trimmedTickets = tickets.map((ticket) => ticket.trim());
    const ticketsToSave = trimmedTickets.filter((ticket) => ticket !== '');
    await fetch(`http://localhost:3000/room/${roomName}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticketsToSave, baseUrl }),
    });

    navigate(`/room/${roomName}/voting`);
  };

  return (
    <div className="mx-auto">
      <h2>Set Tickets for Room {roomName}</h2>
      <div className="form-group text-start">
        <label htmlFor="baseUrl">Base Url For Tickets: </label>
        <input
          type="text"
          className="form-control"
          id="name"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Enter the base URL for your tickets"
          required
        />
      </div>

      <div className="row">
        {tickets.map((ticket, index) => (
          <div className="col-3" key={index}>
            <div className="form-group text-start">
              <label htmlFor={`ticket${index}`}>Ticket ID: </label>
              <input
                type="text"
                className="form-control"
                id={`ticket${index}`}
                value={ticket}
                onChange={(e) =>
                  setTickets((prevTickets) => {
                    const newTickets = [...prevTickets];
                    newTickets[index] = e.target.value;
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
      <button className="btn btn-success mt-2" onClick={() => saveTickets()}>
        Save Tickets
      </button>
    </div>
  );
};

export default SetTickets;
