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
        <form onSubmit={join}>
            <label htmlFor="roomId" className="form-label">
                Room ID
            </label>
            <div className="d-flex gap-2">
                <input
                    type="text"
                    className="form-control form-control-lg"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="e.g. abc123"
                    autoFocus
                />
                <button
                    type="submit"
                    className="btn btn-primary btn-lg text-nowrap"
                    disabled={!trimmedRoomId}
                >
                    Join room
                </button>
            </div>
        </form>
    );
};

export default JoinExistingRoom;
