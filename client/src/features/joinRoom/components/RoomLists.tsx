import { MouseEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomVotingPath } from '../../../routes';
import { RoomSummary } from '../../../types';
import FavouriteButton from './FavouriteButton';

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
    });

// older API responses only listed rooms the user created, without the flag
const isMine = (room: RoomSummary) => room.is_admin ?? true;

const byLastJoined = (a: RoomSummary, b: RoomSummary) =>
    (b.last_joined_at ?? b.created_at).localeCompare(
        a.last_joined_at ?? a.created_at
    );

type RoomListsProps = {
    rooms: RoomSummary[];
    onToggleFavourite: (room: RoomSummary) => void;
};

type RoomSectionProps = RoomListsProps & {
    title: string;
    empty?: string;
};

const RoomSection = ({
    title,
    rooms,
    empty,
    onToggleFavourite,
}: RoomSectionProps) => {
    const navigate = useNavigate();

    const goToRoom = (roomName: string) => (e: MouseEvent) => {
        e.preventDefault();
        navigate(roomVotingPath(roomName));
    };

    if (!rooms.length && !empty) return null;

    return (
        <section className="mt-5">
            <div className="d-flex align-items-baseline justify-content-between mb-3">
                <h2 className="h5 fw-bold mb-0">{title}</h2>
                {rooms.length > 0 && (
                    <span className="text-secondary small">
                        {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
                    </span>
                )}
            </div>
            {rooms.length === 0 ? (
                <div className="card border-0 bg-body-tertiary text-center text-secondary p-4">
                    {empty}
                </div>
            ) : (
                <div className="row g-3">
                    {rooms.map((room) => (
                        <div className="col-sm-6 col-lg-4" key={room.room_id}>
                            <a
                                href={roomVotingPath(room.room_name)}
                                className="card room-card h-100 dashboard-card text-decoration-none"
                                onClick={goToRoom(room.room_name)}
                            >
                                <div className="card-body d-flex gap-2">
                                    <div className="flex-grow-1 min-w-0">
                                        <h3 className="h6 fw-bold text-body mb-1">
                                            {room.friendly_name}
                                            {room.hidden && (
                                                <span className="badge text-bg-secondary ms-2">
                                                    Hidden
                                                </span>
                                            )}
                                        </h3>
                                        <div className="small text-secondary">
                                            <code>{room.room_name}</code> ·{' '}
                                            {room.is_admin ||
                                            !room.last_joined_at
                                                ? `Created ${formatDate(room.created_at)}`
                                                : `Joined ${formatDate(room.last_joined_at)}`}
                                        </div>
                                    </div>
                                    <FavouriteButton
                                        favourite={!!room.favourite}
                                        roomName={room.friendly_name}
                                        onToggle={() => onToggleFavourite(room)}
                                    />
                                </div>
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

/** The user's rooms: favourites, ones they created and ones they joined, with hidden rooms on request */
const RoomLists = ({ rooms, onToggleFavourite }: RoomListsProps) => {
    const [showHidden, setShowHidden] = useState(false);

    const visible = rooms.filter((r) => !r.hidden);
    const hidden = rooms.filter((r) => r.hidden);
    const favourites = visible.filter((r) => r.favourite);
    const created = visible.filter((r) => isMine(r) && !r.favourite);
    const joined = visible
        .filter((r) => !isMine(r) && !r.favourite)
        .sort(byLastJoined);

    return (
        <>
            <RoomSection
                title="Favourites"
                rooms={favourites}
                onToggleFavourite={onToggleFavourite}
            />
            <RoomSection
                title="My rooms"
                rooms={created}
                empty={
                    favourites.some(isMine)
                        ? undefined
                        : "You haven't created any rooms yet. Rooms you create will appear here."
                }
                onToggleFavourite={onToggleFavourite}
            />
            <RoomSection
                title="Recently joined"
                rooms={joined}
                onToggleFavourite={onToggleFavourite}
            />
            {hidden.length > 0 && (
                <div className="mt-5">
                    <button
                        type="button"
                        className="btn btn-link px-0 text-secondary"
                        aria-expanded={showHidden}
                        onClick={() => setShowHidden((s) => !s)}
                    >
                        {showHidden ? 'Hide' : 'Show'} hidden rooms (
                        {hidden.length})
                    </button>
                    {showHidden && (
                        <RoomSection
                            title="Hidden rooms"
                            rooms={hidden}
                            onToggleFavourite={onToggleFavourite}
                        />
                    )}
                </div>
            )}
        </>
    );
};

export default RoomLists;
