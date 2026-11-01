import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorAlert from '../../../../../components/ErrorAlert';
import { useApi, useMyTeams, useUserSettings } from '../../../../../hooks';
import { NewRoomOptions } from '../../../../../types';
import { paths } from '../../../../../routes';
import { roomTicketsPath } from '../../../routes';
import {
    defaultSchedule,
    fromLocalInputValue,
    normaliseBaseUrl,
} from '../../../../../utils';
import TeamRoomPicker from './TeamRoomPicker';

const CreateRoomForm = () => {
    const [roomName, setRoomName] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [baseUrlEdited, setBaseUrlEdited] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(defaultSchedule);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const api = useApi();
    const { settings } = useUserSettings();
    const { teams } = useMyTeams();
    const [teamOptions, setTeamOptions] = useState<NewRoomOptions>();

    // start from the user's saved default unless they've already typed one
    useEffect(() => {
        if (settings.defaultBaseUrl && !baseUrlEdited) {
            setBaseUrl(settings.defaultBaseUrl);
        }
    }, [settings.defaultBaseUrl, baseUrlEdited]);
    const navigate = useNavigate();

    const createRoom = async (e: FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!roomName || !baseUrl) {
            setError('Please enter a room name and base URL for tickets.');
            return;
        }
        const when = fromLocalInputValue(scheduledAt);
        if (!when) {
            setError('Please choose when the planning will happen.');
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const roomId = await api.createRoom(
                roomName,
                normaliseBaseUrl(baseUrl),
                when,
                teamOptions
            );
            navigate(roomTicketsPath(roomId));
        } catch (error) {
            console.error('Error creating new room:', error);
            setError('Failed to create room. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={createRoom}>
            <ErrorAlert message={error} onDismiss={() => setError(null)} />
            <div className="row g-3">
                <div className="col-md-6">
                    <label htmlFor="roomName" className="form-label">
                        Room Name
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g. Sprint 42 refinement"
                        autoFocus
                    />
                </div>
                <div className="col-md-6">
                    <label htmlFor="baseUrl" className="form-label">
                        Base URL for tickets
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="baseUrl"
                        value={baseUrl}
                        onChange={(e) => {
                            setBaseUrl(e.target.value);
                            setBaseUrlEdited(true);
                        }}
                        placeholder="e.g. https://your-company.atlassian.net/browse"
                    />
                    <div className="form-text">
                        Ticket links are built from this URL. Save a default in{' '}
                        <a href={paths.settings}>Settings</a>.
                    </div>
                </div>
                <div className="col-md-6">
                    <label htmlFor="scheduledAt" className="form-label">
                        Planning date and time
                    </label>
                    <input
                        type="datetime-local"
                        className="form-control"
                        id="scheduledAt"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        required
                    />
                    <div className="form-text">
                        When the team will get together. You can change it later
                        from the room.
                    </div>
                </div>
                {teams.length > 0 && (
                    <TeamRoomPicker teams={teams} onChange={setTeamOptions} />
                )}
            </div>
            <button
                type="submit"
                className="btn btn-primary mt-3"
                disabled={submitting}
            >
                Create room
            </button>
        </form>
    );
};

export default CreateRoomForm;
