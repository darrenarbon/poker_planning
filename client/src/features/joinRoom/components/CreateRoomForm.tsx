import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorAlert from '../../../components/ErrorAlert';
import { DEFAULT_TICKET_BASE_URL } from '../../../constants';
import { useApi } from '../../../hooks';
import { roomTicketsPath } from '../../../routes';
import { normaliseBaseUrl } from '../../../utils';

const CreateRoomForm = () => {
    const [roomName, setRoomName] = useState('');
    const [baseUrl, setBaseUrl] = useState(DEFAULT_TICKET_BASE_URL);
    const [error, setError] = useState<string | null>(null);
    const api = useApi();
    const navigate = useNavigate();

    const createRoom = async (e: FormEvent) => {
        e.preventDefault();
        if (!roomName || !baseUrl) {
            setError('Please enter a room name and base URL for tickets.');
            return;
        }
        setError(null);
        try {
            const roomId = await api.createRoom(
                roomName,
                normaliseBaseUrl(baseUrl)
            );
            navigate(roomTicketsPath(roomId));
        } catch (error) {
            console.error('Error creating new room:', error);
            setError('Failed to create room. Please try again.');
        }
    };

    return (
        <form onSubmit={createRoom}>
            <ErrorAlert message={error} onDismiss={() => setError(null)} />
            <div className="row g-3">
                <div className="col-md-6">
                    <label htmlFor="roomName" className="form-label">
                        Room Name
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g. Sprint 42 refinement"
                        autoFocus
                    />
                </div>
                <div className="col-md-6">
                    <label htmlFor="baseUrl" className="form-label">
                        Base URL for tickets
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="baseUrl"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="Enter the base URL for your tickets"
                    />
                    <div className="form-text">
                        Ticket links are built from this URL.
                    </div>
                </div>
            </div>
            <button type="submit" className="btn btn-primary mt-3">
                Create room
            </button>
        </form>
    );
};

export default CreateRoomForm;
