import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomVotingPath } from '../../../routes';

const JoinExistingRoom = () => {
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    return (
        <>
            <h2>Join an existing room</h2>
            <div className="form-group">
                <label htmlFor="roomId">Room ID: </label>
                <input
                    type="text"
                    className="form-control"
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter your room ID"
                />
            </div>
            <button
                className="btn btn-primary btn-lg mt-2"
                onClick={() => navigate(roomVotingPath(roomId))}
            >
                Join room
            </button>
        </>
    );
};

export default JoinExistingRoom;
