import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { ApiError } from '../../services/api';
import { useApi } from '../../hooks';
import { InvitePreview } from '../../types';
import { paths, teamPath } from '../../routes';
import { roleLabels } from './teamLabels';

/** Where an invite link lands: shows the team and joins it on confirmation */
const InvitePage = () => {
    const { token = '' } = useParams();
    const { user } = useAuth0();
    const api = useApi();
    const navigate = useNavigate();
    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [invalid, setInvalid] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                // new people have no account here until the API has seen them
                await api.login(user);
                setPreview(await api.previewInvite(token));
            } catch (error) {
                console.error('Failed to load invite:', error);
                if (error instanceof ApiError && error.status === 410) {
                    setInvalid(true);
                } else {
                    setError('Could not load this invite. Please try again.');
                }
            }
        };
        load();
    }, [api, user, token]);

    const join = async () => {
        setJoining(true);
        try {
            const { teamId } = await api.acceptInvite(token);
            navigate(teamPath(teamId));
        } catch (error) {
            console.error('Failed to join team:', error);
            setError('Could not join the team. Please try again.');
            setJoining(false);
        }
    };

    const renderContent = () => {
        if (invalid) {
            return (
                <div className="text-center py-5">
                    <h1 className="h3 fw-bold">
                        This invite is no longer valid
                    </h1>
                    <p className="text-secondary">
                        It may have expired or been withdrawn. Ask the team for
                        a new link.
                    </p>
                    <a className="btn btn-outline-primary" href={paths.teams}>
                        Go to your teams
                    </a>
                </div>
            );
        }
        if (!preview) return error ? null : <Loading />;
        if (preview.alreadyMember) {
            return (
                <div className="text-center py-5">
                    <h1 className="h3 fw-bold">
                        You are already in {preview.teamName}
                    </h1>
                    <a
                        className="btn btn-primary mt-2"
                        href={teamPath(preview.teamId)}
                    >
                        Open the team
                    </a>
                </div>
            );
        }
        return (
            <div className="text-center py-5">
                <h1 className="h3 fw-bold">Join {preview.teamName}?</h1>
                <p className="text-secondary">
                    You will join as {roleLabels[preview.role].toLowerCase()}.
                </p>
                <button
                    type="button"
                    className="btn btn-primary px-4"
                    onClick={join}
                    disabled={joining}
                >
                    Join team
                </button>
            </div>
        );
    };

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <ErrorAlert message={error} onDismiss={() => setError(null)} />
                {renderContent()}
            </div>
        </>
    );
};

export default InvitePage;
