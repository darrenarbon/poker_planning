import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomVotingPath } from '../../../routes';

const JoinExistingRoom = () => {
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();
    const trimmedRoomId = roomId.trim();

    const join = (e: FormEvent) => {
        e.preventDefault();
        if (trimmedRoomId) {
            navigate(roomVotingPath(trimmedRoomId));
        }
    };

    return (
        <form className="card h-100 dashboard-card" onSubmit={join}>
            <div className="card-body p-4 d-flex flex-column">
                <h2 className="h5 fw-bold">Join a room</h2>
                <p className="text-secondary small">
                    Got a room ID from a teammate? Enter it to jump straight in.
                </p>
                <label htmlFor="roomId" className="form-label">
                    Room ID
                </label>
                <input
                    type="text"
                    className="form-control form-control-lg"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="e.g. abc123"
                />
                <button
                    type="submit"
                    className="btn btn-primary btn-lg mt-3"
                    disabled={!trimmedRoomId}
                >
                    Join room
                </button>
            </div>
        </form>
    );
};

export default JoinExistingRoom;
