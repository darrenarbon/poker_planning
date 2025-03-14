import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import NavBar from '../NavBar';

const JoinRoom = () => {
    const [roomId, setRoomId] = useState<string>('');
    const navigate = useNavigate();
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

    const joinActiveRoom = async () => {
        navigate(`/room/${roomId}/voting`);
    };

    useEffect(() => {
        const logInUser = async () => {
            if (isAuthenticated) {
                const token = await getAccessTokenSilently();

                await fetch(`${config.apiUrl}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ user }),
                });
            }
        };

        logInUser();
    }, [getAccessTokenSilently, isAuthenticated, user]);

    return (
        <div>
            <NavBar auth0User={user} />
            {isAuthenticated && user && (
                <>
                    <h2>Join a Room</h2>
                    <div className="row justify-content-center">
                        <div className="col-6">
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
                                onClick={joinActiveRoom}
                            >
                                Join Room
                            </button>
                        </div>
                    </div>
                </>
            )}
            {!isAuthenticated && (
                <h4>Please log in to create or join a room</h4>
            )}
        </div>
    );
};

export default JoinRoom;
