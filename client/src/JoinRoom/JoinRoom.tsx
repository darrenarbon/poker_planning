import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import NavBar from '../NavBar';

type Room = {
    room_id: number;
    room_name: string;
    created_at: string;
    admin_id: number;
    friendly_name: string;
};

const JoinRoom = () => {
    const [roomId, setRoomId] = useState<string>('');
    const [myRooms, setMyRooms] = useState<Room[]>([]);
    const navigate = useNavigate();
    const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

    const joinActiveRoom = async () => {
        navigate(`/room/${roomId}/voting`);
    };

    useEffect(() => {
        const logInUser = async () => {
            if (isAuthenticated) {
                try {
                    const token = await getAccessTokenSilently();

                    await fetch(`${config.apiUrl}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ user }),
                    });

                    const roomsForUser = await fetch(
                        `${config.apiUrl}/users/${user?.sub}/rooms`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    const { rooms } = (await roomsForUser.json()) as {
                        rooms: Room[];
                    };
                    setMyRooms(rooms);
                } catch (error) {
                    console.error('Error logging in user:', error);
                }
            }
        };

        logInUser();
    }, [getAccessTokenSilently, isAuthenticated, user]);

    const navigateToRoom = (roomId: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        navigate(`/room/${roomId}/voting`);
    };

    return (
        <div className="container text-center mt-4">
            <NavBar auth0User={user} />
            {isAuthenticated && user && (
                <div className="row">
                    <div className="col-6">
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
                            onClick={joinActiveRoom}
                        >
                            Join room
                        </button>
                    </div>
                    <div className="col-6">
                        <h2>My rooms</h2>

                        <div className="list-group">
                            {myRooms.map((room) => (
                                <a
                                    href="#"
                                    className="list-group-item list-group-item-action"
                                    onClick={navigateToRoom(room.room_name)}
                                    key={room.room_id}
                                >
                                    {room.friendly_name} ({room.room_name}){' '}
                                    created on{' '}
                                    {new Date(
                                        room.created_at
                                    ).toLocaleDateString('en-GB', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: '2-digit',
                                    })}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {!isAuthenticated && (
                <h2>Please log in to create or join a room</h2>
            )}
        </div>
    );
};

export default JoinRoom;
