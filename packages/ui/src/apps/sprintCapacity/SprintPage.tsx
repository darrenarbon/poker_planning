import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import HolidaysPanel from '../../features/holidays/HolidaysPanel';
import { jobTitleLabel } from '../../features/teams/teamLabels';
import { useApi, useConfirm } from '../../hooks';
import { ApiError } from '../../services/api';
import { SprintDetails, SprintInput, TeamDetails } from '../../types';
import ForecastCard from './components/ForecastCard';
import SprintForm from './components/SprintForm';
import { capacityPaths, capacityTeamPath } from './routes';
import {
    formatNumber,
    formatSprintDates,
    statusBadge,
    statusLabels,
} from './sprintLabels';

/** One sprint: its forecast, each person's leave, and starting, closing and editing it */
const SprintPage = () => {
    const { teamId: teamIdParam = '', sprintId: sprintIdParam = '' } =
        useParams();
    const teamId = Number(teamIdParam);
    const sprintId = Number(sprintIdParam);
    const api = useApi();
    const navigate = useNavigate();
    const [confirm, confirmModal] = useConfirm();
    const [details, setDetails] = useState<SprintDetails | null>(null);
    const [team, setTeam] = useState<TeamDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [editing, setEditing] = useState(false);
    const [closing, setClosing] = useState(false);
    const [completed, setCompleted] = useState('');
    const [planned, setPlanned] = useState('');
    const [leaveFor, setLeaveFor] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [sprint, teamDetails] = await Promise.all([
                api.getSprint(teamId, sprintId),
                api.getTeam(teamId),
            ]);
            setDetails(sprint);
            setTeam(teamDetails);
        } catch (error) {
            console.error('Failed to load sprint:', error);
            if (error instanceof ApiError && error.status === 404) {
                setNotFound(true);
            } else {
                setError(
                    'Could not load this sprint. Please refresh to try again.'
                );
            }
        }
    }, [api, teamId, sprintId]);

    useEffect(() => {
        load();
    }, [load]);

    const act = async (change: () => Promise<unknown>, failure: string) => {
        setError(null);
        try {
            await change();
            await load();
            return true;
        } catch (error) {
            console.error(failure, error);
            setError(
                error instanceof ApiError && error.status === 409
                    ? 'That is not possible for this sprint right now. It may already have changed.'
                    : failure
            );
            return false;
        }
    };

    if (notFound) {
        return (
            <>
                <NavBar />
                <div className="container mt-4">
                    <p>That sprint could not be found.</p>
                    <a href={capacityPaths.home}>Back to the planner</a>
                </div>
            </>
        );
    }

    if (!details || !team) {
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

    const { sprint, forecast, canManage } = details;
    const members = new Map(team.members.map((m) => [m.userId, m]));

    const save = async (input: SprintInput) => {
        const saved = await act(
            () => api.updateSprint(teamId, sprint.sprintId, input),
            'Could not save the sprint.'
        );
        if (saved) setEditing(false);
        return saved;
    };

    const close = async () => {
        const completedValue = Number(completed);
        const plannedValue = Number(planned);
        if (
            completed.trim() === '' ||
            !Number.isFinite(completedValue) ||
            completedValue < 0
        ) {
            setError('Enter the points that were completed, 0 or more.');
            return;
        }
        if (
            planned.trim() === '' ||
            !Number.isFinite(plannedValue) ||
            plannedValue < 0
        ) {
            setError('Enter the points that were planned, 0 or more.');
            return;
        }
        const closedOk = await act(
            () =>
                api.closeSprint(teamId, sprint.sprintId, {
                    completedPoints: completedValue,
                    plannedPoints: plannedValue,
                }),
            'Could not close the sprint.'
        );
        if (closedOk) setClosing(false);
    };

    const remove = () =>
        confirm({
            title: 'Delete sprint',
            message: `Delete ${sprint.name}? Its figures will no longer count towards velocity.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await api.deleteSprint(teamId, sprint.sprintId);
                    navigate(capacityTeamPath(teamId));
                } catch (error) {
                    console.error('Failed to delete sprint:', error);
                    setError('Could not delete the sprint.');
                }
            },
        });

    const leaveMember = leaveFor === null ? undefined : members.get(leaveFor);

    return (
        <>
            <NavBar />
            {confirmModal}
            <div className="container mt-4 pb-5">
                <div className="dashboard">
                    <a className="small" href={capacityTeamPath(teamId)}>
                        &larr; {team.team.name}
                    </a>
                    <header className="mt-2 mb-4 d-flex flex-wrap align-items-start gap-2">
                        <div className="flex-grow-1">
                            <h1 className="h3 fw-bold mb-1">
                                {sprint.name}{' '}
                                <span
                                    className={`badge fs-6 ${statusBadge[sprint.status]}`}
                                >
                                    {statusLabels[sprint.status]}
                                </span>
                            </h1>
                            <p className="text-secondary mb-0">
                                {formatSprintDates(
                                    sprint.startDate,
                                    sprint.endDate
                                )}
                            </p>
                        </div>
                        {canManage && !editing && (
                            <div className="d-flex flex-wrap gap-2">
                                {sprint.status === 'planned' && (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() =>
                                            act(
                                                () =>
                                                    api.startSprint(
                                                        teamId,
                                                        sprint.sprintId
                                                    ),
                                                'Could not start the sprint.'
                                            )
                                        }
                                    >
                                        Start sprint
                                    </button>
                                )}
                                {sprint.status !== 'closed' && !closing && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => {
                                            setPlanned(
                                                sprint.plannedPoints === null
                                                    ? ''
                                                    : String(
                                                          sprint.plannedPoints
                                                      )
                                            );
                                            setClosing(true);
                                        }}
                                    >
                                        Close sprint
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setEditing(true)}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={remove}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </header>
                    <ErrorAlert
                        message={error}
                        onDismiss={() => setError(null)}
                    />

                    {closing && (
                        <section className="card dashboard-card mb-4">
                            <div className="card-body">
                                <h2 className="h5 fw-bold">Close the sprint</h2>
                                <p className="text-secondary small">
                                    Record what actually got done. This is what
                                    future forecasts learn from. The team&apos;s
                                    available days are fixed from the leave
                                    entered right now.
                                </p>
                                <div className="row g-3">
                                    <div className="col-6 col-md-3">
                                        <label
                                            htmlFor="closePlanned"
                                            className="form-label"
                                        >
                                            Points planned
                                        </label>
                                        <input
                                            id="closePlanned"
                                            type="number"
                                            min={0}
                                            step="0.5"
                                            className="form-control"
                                            value={planned}
                                            onChange={(e) =>
                                                setPlanned(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <label
                                            htmlFor="closeCompleted"
                                            className="form-label"
                                        >
                                            Points completed
                                        </label>
                                        <input
                                            id="closeCompleted"
                                            type="number"
                                            min={0}
                                            step="0.5"
                                            className="form-control"
                                            value={completed}
                                            onChange={(e) =>
                                                setCompleted(e.target.value)
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="d-flex gap-2 mt-3">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={close}
                                    >
                                        Close sprint
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setClosing(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="small text-secondary mt-3 mb-0">
                                    Next, plan the following sprint from the
                                    team page and enter what is carried over.
                                </p>
                            </div>
                        </section>
                    )}

                    {editing ? (
                        <div className="card dashboard-card mb-4">
                            <div className="card-body">
                                <h2 className="h5 fw-bold mb-3">Edit sprint</h2>
                                <SprintForm
                                    teamId={teamId}
                                    members={team.members}
                                    mode={
                                        sprint.status === 'closed'
                                            ? 'history'
                                            : 'plan'
                                    }
                                    sprint={sprint}
                                    onSave={save}
                                    onCancel={() => setEditing(false)}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="row g-4">
                            <div className="col-lg-5">
                                {sprint.status === 'closed' ? (
                                    <div className="card dashboard-card mb-3">
                                        <div className="card-body">
                                            <h2 className="h5 fw-semibold">
                                                Result
                                            </h2>
                                            <div className="display-6 fw-bold">
                                                {formatNumber(
                                                    sprint.completedPoints ?? 0
                                                )}
                                                <span className="fs-5 fw-normal text-secondary">
                                                    {' '}
                                                    of{' '}
                                                    {formatNumber(
                                                        sprint.plannedPoints ??
                                                            0
                                                    )}{' '}
                                                    planned
                                                </span>
                                            </div>
                                            <p className="small text-secondary mb-0">
                                                {formatNumber(
                                                    sprint.availablePersonDays ??
                                                        0
                                                )}{' '}
                                                available person-days
                                                {sprint.velocityPerPersonDay !==
                                                    null &&
                                                    ` · ${sprint.velocityPerPersonDay.toFixed(2)} points per person-day`}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <ForecastCard forecast={forecast} />
                                )}
                                <dl className="row small mb-0">
                                    <dt className="col-7 fw-normal text-secondary">
                                        Carried over
                                    </dt>
                                    <dd className="col-5 text-end">
                                        {formatNumber(sprint.carriedOverPoints)}{' '}
                                        points · {sprint.carriedOverTickets}{' '}
                                        {sprint.carriedOverTickets === 1
                                            ? 'ticket'
                                            : 'tickets'}
                                    </dd>
                                    <dt className="col-7 fw-normal text-secondary">
                                        Buffer
                                    </dt>
                                    <dd className="col-5 text-end">
                                        {formatNumber(sprint.bufferPercent)}%
                                    </dd>
                                </dl>
                            </div>
                            <div className="col-lg-7">
                                <h2 className="h5 fw-bold mb-3">
                                    People ({forecast.people.length})
                                </h2>
                                <ul className="list-group mb-3">
                                    {forecast.people.map((p) => {
                                        const member = members.get(p.userId);
                                        const title = jobTitleLabel(p.jobTitle);
                                        const name =
                                            [p.givenName, p.familyName]
                                                .filter(Boolean)
                                                .join(' ') || p.nickname;
                                        return (
                                            <li
                                                key={p.userId}
                                                className="list-group-item d-flex flex-wrap align-items-center gap-2"
                                            >
                                                <div className="flex-grow-1">
                                                    <div className="fw-semibold">
                                                        {name}
                                                    </div>
                                                    {title && (
                                                        <div className="small text-secondary">
                                                            {title}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="small text-end">
                                                    <div>
                                                        {formatNumber(
                                                            p.availableDays
                                                        )}{' '}
                                                        of{' '}
                                                        {forecast.workingDays}{' '}
                                                        days
                                                    </div>
                                                    {p.leaveDays > 0 && (
                                                        <div className="text-secondary">
                                                            {formatNumber(
                                                                p.leaveDays
                                                            )}{' '}
                                                            on leave
                                                        </div>
                                                    )}
                                                </div>
                                                {canManage && member && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary"
                                                        aria-label={`Manage leave for ${name}`}
                                                        onClick={() =>
                                                            setLeaveFor(
                                                                leaveFor ===
                                                                    p.userId
                                                                    ? null
                                                                    : p.userId
                                                            )
                                                        }
                                                    >
                                                        Leave
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                                {leaveMember && (
                                    <div className="card dashboard-card">
                                        <div className="card-body">
                                            <HolidaysPanel
                                                key={leaveMember.userId}
                                                userId={leaveMember.userId}
                                                heading={`Leave for ${
                                                    [
                                                        leaveMember.givenName,
                                                        leaveMember.familyName,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ') ||
                                                    leaveMember.nickname
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={async () => {
                                                    setLeaveFor(null);
                                                    // a closed sprint's days are fixed, so
                                                    // saving it as it is recalculates them
                                                    if (
                                                        sprint.status ===
                                                        'closed'
                                                    ) {
                                                        await act(
                                                            () =>
                                                                api.updateSprint(
                                                                    teamId,
                                                                    sprint.sprintId,
                                                                    {
                                                                        ...sprint,
                                                                        memberIds:
                                                                            sprint.memberIds,
                                                                        plannedPoints:
                                                                            sprint.plannedPoints ??
                                                                            undefined,
                                                                        completedPoints:
                                                                            sprint.completedPoints ??
                                                                            undefined,
                                                                    }
                                                                ),
                                                            'Could not recalculate the sprint.'
                                                        );
                                                    } else {
                                                        load();
                                                    }
                                                }}
                                            >
                                                Done, recalculate
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SprintPage;
