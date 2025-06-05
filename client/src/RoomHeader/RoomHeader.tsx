import { Room } from '../PokerSession/types';

type RoomHeaderProps = {
    room: Room;
};

const RoomHeader = ({ room }: RoomHeaderProps) => {
    return (
        <>
            <h4 className="text-center">
                {room.friendlyName} ({room.roomName})
            </h4>
            <hr />
        </>
    );
};

export default RoomHeader;
