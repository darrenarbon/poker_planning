import { useAuth0 } from '@auth0/auth0-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { ApiError } from '../../services/api';
import { useApi, useConfirm } from '../../hooks';
import {
    AssignableTeamRole,
    TeamDetails,
    TeamInvite,
    TeamMemberInfo,
} from '../../types';
import { invitePath, paths } from '../../routes';
import { formatDate, memberName, roleLabels } from './teamLabels';

const inviteUrl = (token: string) =>
    `${window.location.origin}${invitePath(token)}`;

/** One team: its people and, for owners and admins, the controls to run it */
const TeamPage = () => {
    const { teamId: teamIdParam = '' } = useParams();
    const teamId = Number(teamIdParam);
    const { user } = useAuth0();
    const api = useApi();
    const navigate = useNavigate();
    const [confirm, confirmModal] = useConfirm();

    const [details, setDetails] = useState<TeamDetails | null>(null);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [emailRole, setEmailRole] = useState<AssignableTeamRole>('member');
    const [inviteRole, setInviteRole] = useState<AssignableTeamRole>('member');
    const [copied, setCopied] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const loaded = await api.getTeam(teamId);
            setDetails(loaded);
            setName(loaded.team.name);
            setInvites(
                loaded.canManage ? await api.getTeamInvites(teamId) : []
            );
        } catch (error) {
            console.error('Failed to load team:', error);
            if (error instanceof ApiError && error.status === 404) {
                setNotFound(true);
            } else {
                setError(
                    'Could not load this team. Please refresh to try again.'
                );
            }
        }
    }, [api, teamId]);

    useEffect(() => {
        load();
    }, [load]);

    /** Runs a change, then reloads; shows the API's reason when it is refused */
    const act = async (
        change: () => Promise<unknown>,
        failure: string
    ): Promise<boolean> => {
        setError(null);
        try {
            await change();
            await load();
            return true;
        } catch (error) {
            console.error(failure, error);
            setError(
                error instanceof ApiError && error.status === 409
                    ? 'That person is already in the team.'
                    : error instanceof ApiError && error.status === 404
                      ? 'Nobody has signed up with that email yet. Send them an invite link instead.'
                      : error instanceof ApiError && error.status === 403
                        ? 'You do not have permission to do that.'
                        : failure
            );
            return false;
        }
    };

    if (notFound) {
        return (
            <>
                <NavBar />
                <div className="container mt-4 text-center py-5">
                    <h1 className="h3 fw-bold">Team not found</h1>
                    <p className="text-secondary">
                        It may not exist, or you may not be in it.
                    </p>
                    <a className="btn btn-outline-primary" href={paths.teams}>
                        Back to teams
                    </a>
                </div>
            </>
        );
    }

    if (!details) {
        return (
            <>
                <NavBar />
                <div className="container mt-4">
                    <ErrorAlert message={error} />
                    {!error && <Loading />}
                </div>
            </>
        );
    }

    const { team, canManage, canChangeRoles, myRole, isSuperAdmin } = details;
    const isMe = (m: TeamMemberInfo) => m.sub === user?.sub;

    const canRemove = (m: TeamMemberInfo) =>
        m.role !== 'owner' &&
        (isMe(m) || canChangeRoles || (canManage && m.role === 'member'));

    const rename = (e: FormEvent) => {
        e.preventDefault();
        if (name.trim() && name.trim() !== team.name) {
            act(
                () => api.renameTeam(teamId, name.trim()),
                'Could not rename the team.'
            );
        }
    };

    const addByEmail = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        const ok = await act(
            () => api.addTeamMember(teamId, email.trim(), emailRole),
            'Could not add that person.'
        );
        if (ok) setEmail('');
    };

    const copyInvite = async (invite: TeamInvite) => {
        try {
            await navigator.clipboard.writeText(inviteUrl(invite.token));
            setCopied(invite.invite_id);
        } catch {
            // the link is shown in a box too, so it can be copied by hand
            setCopied(null);
        }
    };

    const confirmRemove = (m: TeamMemberInfo) =>
        confirm({
            title: isMe(m) ? 'Leave team?' : 'Remove from team?',
            message: isMe(m)
                ? `Leave ${team.name}? You will need a new invite to come back.`
                : `Remove ${memberName(m)} from ${team.name}?`,
            confirmLabel: isMe(m) ? 'Leave' : 'Remove',
            variant: 'danger',
            onConfirm: async () => {
                const ok = await act(
                    () => api.removeTeamMember(teamId, m.userId),
                    'Could not remove that person.'
                );
                if (ok && isMe(m) && !isSuperAdmin) navigate(paths.teams);
            },
        });

    const confirmTransfer = (m: TeamMemberInfo) =>
        confirm({
            title: 'Hand over the team?',
            message: `Make ${memberName(m)} the owner of ${team.name}? You will become an admin.`,
            confirmLabel: 'Hand over',
            onConfirm: () => {
                act(
                    () => api.transferTeamOwnership(teamId, m.userId),
                    'Could not hand over the team.'
                );
            },
        });

    const confirmDelete = () =>
        confirm({
            title: 'Delete team?',
            message: `Delete ${team.name}? Its rooms are kept, but stop belonging to a team, and everyone loses access to the team.`,
            confirmLabel: 'Delete team',
            variant: 'danger',
            onConfirm: async () => {
                const ok = await act(
                    () => api.deleteTeam(teamId),
                    'Could not delete the team.'
                );
                if (ok) navigate(paths.teams);
            },
        });

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <div className="dashboard">
                    <a className="small" href={paths.teams}>
                        &larr; All teams
                    </a>
                    <header className="mt-2 mb-4">
                        <h1 className="h3 fw-bold mb-1">{team.name}</h1>
                        <p className="text-secondary mb-0">
                            {myRole
                                ? `You are ${myRole === 'admin' ? 'an' : 'a'} ${roleLabels[myRole].toLowerCase()} of this team.`
                                : 'You are viewing this team as a super admin.'}
                        </p>
                    </header>
                    <ErrorAlert
                        message={error}
                        onDismiss={() => setError(null)}
                    />

                    <section className="mb-5">
                        <h2 className="h5 fw-bold mb-3">
                            People ({details.members.length})
                        </h2>
                        <ul className="list-group">
                            {details.members.map((m) => (
                                <li
                                    key={m.userId}
                                    className="list-group-item d-flex flex-wrap align-items-center gap-2"
                                >
                                    <div className="flex-grow-1 min-w-0">
                                        <div className="fw-semibold">
                                            {memberName(m)}
                                            {isMe(m) && (
                                                <span className="text-secondary fw-normal">
                                                    {' '}
                                                    (you)
                                                </span>
                                            )}
                                        </div>
                                        {m.email && (
                                            <div className="small text-secondary">
                                                {m.email}
                                            </div>
                                        )}
                                    </div>
                                    {canChangeRoles && m.role !== 'owner' ? (
                                        <select
                                            className="form-select form-select-sm w-auto"
                                            aria-label={`Role for ${memberName(m)}`}
                                            value={m.role}
                                            onChange={(e) =>
                                                act(
                                                    () =>
                                                        api.changeTeamMemberRole(
                                                            teamId,
                                                            m.userId,
                                                            e.target
                                                                .value as AssignableTeamRole
                                                        ),
                                                    'Could not change that role.'
                                                )
                                            }
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="member">
                                                Member
                                            </option>
                                        </select>
                                    ) : (
                                        <span
                                            className={`badge ${m.role === 'owner' ? 'text-bg-dark' : 'bg-body-secondary text-body border'}`}
                                        >
                                            {roleLabels[m.role]}
                                        </span>
                                    )}
                                    {canChangeRoles && m.role !== 'owner' && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => confirmTransfer(m)}
                                        >
                                            Make owner
                                        </button>
                                    )}
                                    {canRemove(m) && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={() => confirmRemove(m)}
                                        >
                                            {isMe(m) ? 'Leave' : 'Remove'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>

                    {canManage && (
                        <>
                            <section className="mb-5">
                                <h2 className="h5 fw-bold mb-3">Add someone</h2>
                                <form
                                    className="d-flex flex-wrap gap-2 mb-2"
                                    onSubmit={addByEmail}
                                >
                                    <input
                                        type="email"
                                        className="form-control w-auto flex-grow-1"
                                        aria-label="Email address"
                                        placeholder="Their email address"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                    />
                                    {canChangeRoles && (
                                        <select
                                            className="form-select w-auto"
                                            aria-label="Role to add them as"
                                            value={emailRole}
                                            onChange={(e) =>
                                                setEmailRole(
                                                    e.target
                                                        .value as AssignableTeamRole
                                                )
                                            }
                                        >
                                            <option value="member">
                                                Member
                                            </option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    )}
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={!email.trim()}
                                    >
                                        Add
                                    </button>
                                </form>
                                <div className="form-text">
                                    They need to have logged in to Teamdeck
                                    before. If they have not, send an invite
                                    link instead.
                                </div>
                            </section>

                            <section className="mb-5">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                                    <h2 className="h5 fw-bold mb-0">
                                        Invite links
                                    </h2>
                                    <div className="d-flex gap-2">
                                        {canChangeRoles && (
                                            <select
                                                className="form-select form-select-sm w-auto"
                                                aria-label="Role for the invite"
                                                value={inviteRole}
                                                onChange={(e) =>
                                                    setInviteRole(
                                                        e.target
                                                            .value as AssignableTeamRole
                                                    )
                                                }
                                            >
                                                <option value="member">
                                                    Join as member
                                                </option>
                                                <option value="admin">
                                                    Join as admin
                                                </option>
                                            </select>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() =>
                                                act(
                                                    () =>
                                                        api.createTeamInvite(
                                                            teamId,
                                                            inviteRole
                                                        ),
                                                    'Could not create an invite link.'
                                                )
                                            }
                                        >
                                            New invite link
                                        </button>
                                    </div>
                                </div>
                                {invites.length === 0 ? (
                                    <div className="card border-0 bg-body-tertiary text-center text-secondary p-3">
                                        No active invite links. Create one and
                                        share it with whoever should join.
                                    </div>
                                ) : (
                                    <ul className="list-group">
                                        {invites.map((invite) => (
                                            <li
                                                key={invite.invite_id}
                                                className="list-group-item"
                                            >
                                                <div className="d-flex flex-wrap gap-2 align-items-center">
                                                    <input
                                                        readOnly
                                                        className="form-control form-control-sm w-auto flex-grow-1"
                                                        aria-label="Invite link"
                                                        value={inviteUrl(
                                                            invite.token
                                                        )}
                                                        onFocus={(e) =>
                                                            e.target.select()
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() =>
                                                            copyInvite(invite)
                                                        }
                                                    >
                                                        {copied ===
                                                        invite.invite_id
                                                            ? 'Copied'
                                                            : 'Copy'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() =>
                                                            act(
                                                                () =>
                                                                    api.revokeTeamInvite(
                                                                        teamId,
                                                                        invite.invite_id
                                                                    ),
                                                                'Could not revoke that invite.'
                                                            )
                                                        }
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                                <div className="small text-secondary mt-1">
                                                    Joins as{' '}
                                                    {roleLabels[
                                                        invite.role
                                                    ].toLowerCase()}{' '}
                                                    · expires{' '}
                                                    {formatDate(
                                                        invite.expires_at
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="mb-5">
                                <h2 className="h5 fw-bold mb-3">
                                    Team settings
                                </h2>
                                <form
                                    className="d-flex gap-2 mb-3"
                                    onSubmit={rename}
                                >
                                    <input
                                        className="form-control w-auto flex-grow-1"
                                        aria-label="Team name"
                                        value={name}
                                        maxLength={80}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-outline-primary"
                                        disabled={
                                            !name.trim() ||
                                            name.trim() === team.name
                                        }
                                    >
                                        Rename
                                    </button>
                                </form>
                                {canChangeRoles && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={confirmDelete}
                                    >
                                        Delete team
                                    </button>
                                )}
                            </section>
                        </>
                    )}
                </div>
                {confirmModal}
            </div>
        </>
    );
};

export default TeamPage;
