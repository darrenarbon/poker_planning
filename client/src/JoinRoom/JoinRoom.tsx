import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../config';
import NavBar from '../NavBar';
import Loading from '../Loading';

type Room = {
    room_id: number;
    room_name: string;
    created_at: string;
    admin_id: number;
    friendly_name: string;
};

const JoinRoom = () => {
    const [roomId, setRoomId] = useState<string>('');
    const [roomName, setRoomName] = useState<string>('');
    const [baseUrl, setBaseUrl] = useState<string>(
        'https://leanlibrary.atlassian.net/browse'
    );
    const [loaded, setLoaded] = useState<boolean>(false);
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
                    setLoaded(true);
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

    const createNewRoom = async () => {
        if (!roomName || !baseUrl) {
            alert('Please enter a room name and base URL for tickets.');
            return;
        }

        try {
            const token = await getAccessTokenSilently();
            let trimmedBaseUrl = baseUrl.trim();
            if (trimmedBaseUrl.endsWith('/')) {
                trimmedBaseUrl = trimmedBaseUrl.slice(0, -1);
            }
            const response = await fetch(`${config.apiUrl}/newroom`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ roomName, baseUrl: trimmedBaseUrl }),
            });
            const { roomId } = await response.json();
            navigate(`/room/${roomId}/tickets`);
        } catch (error) {
            console.error('Error creating new room:', error);
            alert('Failed to create room. Please try again.');
        }
    };

    return (
        <div className="container mt-4">
            <NavBar auth0User={user} />
            {!isAuthenticated ? (
                <h2>Please log in to create or join a room</h2>
            ) : loaded && user ? (
                <div className="row">
                    <div className="col-6 text-center p-4">
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
                    <div className="col-6 border-start border-dark p-4">
                        <h2 className="text-center">Create new room</h2>
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
                            <label htmlFor="baseUrl">
                                Base URL for tickets:{' '}
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="baseUrl"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="Enter the base URL for your tickets"
                            />
                        </div>
                        <button
                            className="btn btn-primary mt-2 mb-3"
                            onClick={createNewRoom}
                        >
                            Create room
                        </button>

                        <hr />

                        <h2 className="text-center mt-3">My rooms</h2>

                        <div className="list-group text-center">
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
            ) : (
                <Loading />
            )}
        </div>
    );
};

export default JoinRoom;
