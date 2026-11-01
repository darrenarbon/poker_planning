import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useApi, useMyTeams } from '../../hooks';
import { invitePath, paths, teamPath } from '../../routes';
import { roleLabels, tokenFromInvite } from './teamLabels';

/** The teams the user belongs to, with a way to start one or use an invite */
const TeamsPage = () => {
    const { teams, isSuperAdmin, loaded, error, reload } = useMyTeams();
    const api = useApi();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [invite, setInvite] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const createTeam = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setFormError('Please give your team a name.');
            return;
        }
        setFormError(null);
        try {
            const team = await api.createTeam(name.trim());
            await reload();
            navigate(teamPath(team.team_id));
        } catch (error) {
            console.error('Error creating team:', error);
            setFormError('Could not create the team. Please try again.');
        }
    };

    const useInvite = (e: FormEvent) => {
        e.preventDefault();
        const token = tokenFromInvite(invite);
        if (token) navigate(invitePath(token));
    };

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <ErrorAlert message={error} />
                {!loaded ? (
                    <Loading />
                ) : (
                    <div className="dashboard">
                        <a className="small" href={paths.home}>
                            &larr; Dashboard
                        </a>
                        <header className="mt-2 mb-4">
                            <h1 className="h3 fw-bold mb-1">Teams</h1>
                            <p className="text-secondary mb-0">
                                {isSuperAdmin
                                    ? 'You are a super admin, so you can see and manage every team.'
                                    : 'The people you work with.'}
                            </p>
                        </header>

                        {teams.length === 0 ? (
                            <div className="card border-0 bg-body-tertiary text-center text-secondary p-4 mb-4">
                                You are not in a team yet. Start one below, or
                                use an invite link someone sent you.
                            </div>
                        ) : (
                            <div className="row g-3 mb-4">
                                {teams.map((team) => (
                                    <div
                                        className="col-sm-6 col-lg-4"
                                        key={team.team_id}
                                    >
                                        <a
                                            href={teamPath(team.team_id)}
                                            className="card h-100 dashboard-card text-decoration-none"
                                        >
                                            <div className="card-body">
                                                <h2 className="h6 fw-bold text-body mb-1">
                                                    {team.name}
                                                </h2>
                                                <div className="small text-secondary">
                                                    {team.member_count}{' '}
                                                    {team.member_count === 1
                                                        ? 'person'
                                                        : 'people'}
                                                    {' · '}
                                                    {team.role
                                                        ? roleLabels[team.role]
                                                        : 'Super admin'}
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="row g-4">
                            <form className="col-md-6" onSubmit={createTeam}>
                                <h2 className="h6 fw-bold">Start a team</h2>
                                <ErrorAlert
                                    message={formError}
                                    onDismiss={() => setFormError(null)}
                                />
                                <label
                                    htmlFor="teamName"
                                    className="form-label"
                                >
                                    Team name
                                </label>
                                <div className="d-flex gap-2">
                                    <input
                                        id="teamName"
                                        className="form-control"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        placeholder="e.g. Platform squad"
                                        maxLength={80}
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-primary text-nowrap"
                                    >
                                        Create team
                                    </button>
                                </div>
                                <div className="form-text">
                                    You will be its owner and can invite people
                                    straight away.
                                </div>
                            </form>
                            <form className="col-md-6" onSubmit={useInvite}>
                                <h2 className="h6 fw-bold">
                                    Have an invite link?
                                </h2>
                                <label
                                    htmlFor="inviteLink"
                                    className="form-label"
                                >
                                    Invite link
                                </label>
                                <div className="d-flex gap-2">
                                    <input
                                        id="inviteLink"
                                        className="form-control"
                                        value={invite}
                                        onChange={(e) =>
                                            setInvite(e.target.value)
                                        }
                                        placeholder="Paste it here"
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-outline-primary"
                                        disabled={!invite.trim()}
                                    >
                                        Continue
                                    </button>
                                </div>
                                <div className="form-text">
                                    Opening the link from your email or chat
                                    works too.
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TeamsPage;
