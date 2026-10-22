import { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomVotingPath } from '../../../routes';
import { RoomSummary } from '../../../types';

const formatCreatedAt = (createdAt: string) =>
    new Date(createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
    });

type MyRoomsListProps = {
    rooms: RoomSummary[];
};

const MyRoomsList = ({ rooms }: MyRoomsListProps) => {
    const navigate = useNavigate();

    const goToRoom = (roomName: string) => (e: MouseEvent) => {
        e.preventDefault();
        navigate(roomVotingPath(roomName));
    };

    return (
        <>
            <h2 className="text-center mt-3">My rooms</h2>
            <div className="list-group text-center">
                {rooms.map((room) => (
                    <a
                        href="#"
                        className="list-group-item list-group-item-action"
                        onClick={goToRoom(room.room_name)}
                        key={room.room_id}
                    >
                        {room.friendly_name} ({room.room_name}) created on{' '}
                        {formatCreatedAt(room.created_at)}
                    </a>
                ))}
            </div>
        </>
    );
};

export default MyRoomsList;
