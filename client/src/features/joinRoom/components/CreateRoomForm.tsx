import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorAlert from '../../../components/ErrorAlert';
import { DEFAULT_TICKET_BASE_URL } from '../../../constants';
import { useApi } from '../../../hooks';
import { roomTicketsPath } from '../../../routes';

const normaliseBaseUrl = (url: string) => url.trim().replace(/\/$/, '');

const CreateRoomForm = () => {
    const [roomName, setRoomName] = useState('');
    const [baseUrl, setBaseUrl] = useState(DEFAULT_TICKET_BASE_URL);
    const [error, setError] = useState<string | null>(null);
    const api = useApi();
    const navigate = useNavigate();

    const createRoom = async () => {
        if (!roomName || !baseUrl) {
            setError('Please enter a room name and base URL for tickets.');
            return;
        }
        setError(null);
        try {
            const roomId = await api.createRoom(
                roomName,
                normaliseBaseUrl(baseUrl),
            );
            navigate(roomTicketsPath(roomId));
        } catch (error) {
            console.error('Error creating new room:', error);
            setError('Failed to create room. Please try again.');
        }
    };

    return (
        <>
            <h2 className="text-center">Create new room</h2>
            <ErrorAlert message={error} onDismiss={() => setError(null)} />
            <div className="form-group">
                <label htmlFor="roomName">Room Name: </label>
                <input
                    type="text"
                    className="form-control"
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter a name for your room"
                />
            </div>
            <div className="form-group">
                <label htmlFor="baseUrl">Base URL for tickets: </label>
                <input
                    type="text"
                    className="form-control"
                    id="baseUrl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="Enter the base URL for your tickets"
                />
            </div>
            <button className="btn btn-primary mt-2 mb-3" onClick={createRoom}>
                Create room
            </button>
        </>
    );
};

export default CreateRoomForm;
