import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { addDays, toDay } from '../../features/holidays/leaveDates';
import { useApi } from '../../hooks';
import { ApiError } from '../../services/api';
import { SprintInput, TeamDetails, TeamSprints } from '../../types';
import { capacityPaths, sprintPath } from './routes';
import SprintForm, { SprintFormMode } from './components/SprintForm';
import {
    confidenceLabels,
    formatNumber,
    formatSprintDates,
    statusBadge,
    statusLabels,
} from './sprintLabels';

const SPRINT_DAYS = 14;

/** A team's sprints, its velocity, and the forms to plan the next one or add history */
const TeamCapacityPage = () => {
    const { teamId: teamIdParam = '' } = useParams();
    const teamId = Number(teamIdParam);
    const api = useApi();
    const navigate = useNavigate();
    const [team, setTeam] = useState<TeamDetails | null>(null);
    const [data, setData] = useState<TeamSprints | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [form, setForm] = useState<SprintFormMode | null>(null);

    const load = useCallback(async () => {
        try {
            const [details, sprints] = await Promise.all([
                api.getTeam(teamId),
                api.getTeamSprints(teamId),
            ]);
            setTeam(details);
            setData(sprints);
        } catch (error) {
            console.error('Failed to load sprints:', error);
            if (error instanceof ApiError && error.status === 404) {
                setNotFound(true);
            } else {
                setError(
                    'Could not load the sprints. Please refresh to try again.'
                );
            }
        }
    }, [api, teamId]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (input: SprintInput) => {
        try {
            const created = await api.createSprint(teamId, input);
            navigate(sprintPath(teamId, created.sprintId));
            return true;
        } catch (error) {
            console.error('Failed to create sprint:', error);
            return false;
        }
    };

    if (notFound) {
        return (
            <>
                <NavBar />
                <div className="container mt-4">
                    <p>That team could not be found.</p>
                    <a href={capacityPaths.home}>Back to the planner</a>
                </div>
            </>
        );
    }

    if (!team || !data) {
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

    const { sprints, velocity, canManage } = data;
    const latest = [...sprints].sort((a, b) =>
        b.endDate.localeCompare(a.endDate)
    )[0];
    const nextStart =
        latest && latest.endDate >= toDay(new Date())
            ? addDays(latest.endDate, 1)
            : toDay(new Date());
    const closedCount = sprints.filter((s) => s.status === 'closed').length;

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <div className="dashboard">
                    <a className="small" href={capacityPaths.home}>
                        &larr; Sprint capacity planner
                    </a>
                    <header className="mt-2 mb-4">
                        <h1 className="h3 fw-bold mb-1">{team.team.name}</h1>
                        <p className="text-secondary mb-0">
                            Sprint capacity and velocity
                        </p>
                    </header>
                    <ErrorAlert
                        message={error}
                        onDismiss={() => setError(null)}
                    />

                    <section className="card dashboard-card mb-4">
                        <div className="card-body">
                            <h2 className="h5 fw-bold">Team velocity</h2>
                            {velocity.perPersonDay === null ? (
                                <p className="text-secondary mb-0">
                                    {closedCount === 0
                                        ? 'No sprints have been closed yet. '
                                        : 'One closed sprint so far. '}
                                    Velocity needs at least 2 closed sprints:
                                    close them as you go, or add your past
                                    sprints below.
                                </p>
                            ) : (
                                <>
                                    <div className="fs-3 fw-bold">
                                        {velocity.perPersonDay.toFixed(2)}
                                        <span className="fs-6 fw-normal text-secondary">
                                            {' '}
                                            points per person per working day
                                        </span>
                                    </div>
                                    <div className="small text-secondary">
                                        Last {velocity.sprintsUsed} closed
                                        sprints, ranging{' '}
                                        {velocity.lowPerPersonDay?.toFixed(2)}–
                                        {velocity.highPerPersonDay?.toFixed(2)}{' '}
                                        ·{' '}
                                        {confidenceLabels[velocity.confidence]}
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {canManage ? (
                        <section className="mb-4">
                            {form ? (
                                <div className="card dashboard-card">
                                    <div className="card-body">
                                        <h2 className="h5 fw-bold mb-3">
                                            {form === 'plan'
                                                ? 'Plan a sprint'
                                                : 'Add a past sprint'}
                                        </h2>
                                        <SprintForm
                                            teamId={teamId}
                                            members={team.members}
                                            mode={form}
                                            initial={
                                                form === 'plan'
                                                    ? {
                                                          startDate: nextStart,
                                                          endDate: addDays(
                                                              nextStart,
                                                              SPRINT_DAYS - 1
                                                          ),
                                                          name: `Sprint ${sprints.length + 1}`,
                                                      }
                                                    : {}
                                            }
                                            onSave={save}
                                            onCancel={() => setForm(null)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => setForm('plan')}
                                    >
                                        Plan a sprint
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => setForm('history')}
                                    >
                                        Add a past sprint
                                    </button>
                                </div>
                            )}
                        </section>
                    ) : (
                        <p className="text-secondary small">
                            Only team owners and admins can plan sprints.
                        </p>
                    )}

                    <section>
                        <h2 className="h5 fw-bold mb-3">
                            Sprints ({sprints.length})
                        </h2>
                        {sprints.length === 0 ? (
                            <p className="text-secondary">No sprints yet.</p>
                        ) : (
                            <ul className="list-group">
                                {sprints.map((s) => (
                                    <li
                                        key={s.sprintId}
                                        className="list-group-item d-flex flex-wrap align-items-center gap-2"
                                    >
                                        <div className="flex-grow-1">
                                            <a
                                                href={sprintPath(
                                                    teamId,
                                                    s.sprintId
                                                )}
                                                className="fw-semibold"
                                            >
                                                {s.name}
                                            </a>
                                            <div className="small text-secondary">
                                                {formatSprintDates(
                                                    s.startDate,
                                                    s.endDate
                                                )}
                                            </div>
                                        </div>
                                        {s.status === 'closed' && (
                                            <span className="small text-secondary">
                                                {formatNumber(
                                                    s.completedPoints ?? 0
                                                )}{' '}
                                                of{' '}
                                                {formatNumber(
                                                    s.plannedPoints ?? 0
                                                )}{' '}
                                                points
                                            </span>
                                        )}
                                        <span
                                            className={`badge ${statusBadge[s.status]}`}
                                        >
                                            {statusLabels[s.status]}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
};

export default TeamCapacityPage;
