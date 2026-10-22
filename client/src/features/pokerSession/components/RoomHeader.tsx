import { useState } from 'react';
import { roomVotingPath } from '../../../routes';
import { Room } from '../../../types';
import FavouriteButton from '../../joinRoom/components/FavouriteButton';

type RoomHeaderProps = {
    room: Room;
    onToggleFavourite?: () => void;
};

const RoomHeader = ({ room, onToggleFavourite }: RoomHeaderProps) => {
    const [copied, setCopied] = useState(false);

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(
                `${window.location.origin}${roomVotingPath(room.roomName)}`
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <header className="mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-1">
                    <h1 className="h4 fw-bold mb-0">{room.friendlyName}</h1>
                    {onToggleFavourite && (
                        <FavouriteButton
                            favourite={!!room.favourite}
                            roomName={room.friendlyName}
                            onToggle={onToggleFavourite}
                        />
                    )}
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="text-secondary small">Room ID</span>
                    <code className="room-id-pill">{room.roomName}</code>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={copyInviteLink}
                        title="Copy a link to paste into Teams"
                    >
                        {copied ? 'Link copied!' : 'Copy invite link'}
                    </button>
                </div>
            </div>
            {room.hidden && (
                <div className="alert alert-secondary py-2 small mt-3 mb-0">
                    This room is finished and hidden from everyone&apos;s room
                    lists. Anyone with the link can still open it.
                </div>
            )}
        </header>
    );
};

export default RoomHeader;
