import { Room } from '../../../types';

type RoomHeaderProps = {
    room: Room;
};

const RoomHeader = ({ room }: RoomHeaderProps) => (
    <>
        <h4 className="text-center">
            {room.friendlyName} ({room.roomName})
        </h4>
        <hr />
    </>
);

export default RoomHeader;
