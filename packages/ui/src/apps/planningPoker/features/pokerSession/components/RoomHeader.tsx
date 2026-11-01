import { FormEvent, useState } from 'react';
import { roomVotingPath } from '../../../routes';
import { Room } from '../../../../../types';
import {
    formatSchedule,
    fromLocalInputValue,
    toLocalInputValue,
} from '../../../../../utils';
import FavouriteButton from '../../joinRoom/components/FavouriteButton';

type RoomHeaderProps = {
    room: Room;
    onToggleFavourite?: () => void;
    /** facilitators can move the planning session; resolves true when saved */
    onChangeSchedule?: (scheduledAt: string) => Promise<boolean>;
};

const RoomHeader = ({
    room,
    onToggleFavourite,
    onChangeSchedule,
}: RoomHeaderProps) => {
    const [copied, setCopied] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);

    const startEditing = () => {
        setDraft(room.scheduledAt ? toLocalInputValue(room.scheduledAt) : '');
        setEditing(true);
    };

    const saveSchedule = async (e: FormEvent) => {
        e.preventDefault();
        const when = fromLocalInputValue(draft);
        if (!when || !onChangeSchedule) return;
        setSaving(true);
        const saved = await onChangeSchedule(when);
        setSaving(false);
        // on failure the session shows the error and the edit stays open
        if (saved) setEditing(false);
    };

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
            {(room.scheduledAt || onChangeSchedule) &&
                (editing ? (
                    <form
                        className="d-flex flex-wrap align-items-center gap-2 mt-2"
                        onSubmit={saveSchedule}
                    >
                        <label
                            htmlFor="roomScheduledAt"
                            className="small text-secondary"
                        >
                            Planning date and time
                        </label>
                        <input
                            id="roomScheduledAt"
                            type="datetime-local"
                            className="form-control form-control-sm w-auto"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            required
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="btn btn-sm btn-primary"
                            disabled={saving || !fromLocalInputValue(draft)}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setEditing(false)}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                    </form>
                ) : (
                    <div className="small text-secondary mt-1">
                        {room.scheduledAt && (
                            <>
                                Planning:{' '}
                                <time dateTime={room.scheduledAt}>
                                    {formatSchedule(room.scheduledAt)}
                                </time>
                            </>
                        )}
                        {onChangeSchedule && (
                            <button
                                type="button"
                                className="btn btn-link btn-sm py-0"
                                onClick={startEditing}
                            >
                                {room.scheduledAt ? 'Change' : 'Set date'}
                            </button>
                        )}
                    </div>
                ))}
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
