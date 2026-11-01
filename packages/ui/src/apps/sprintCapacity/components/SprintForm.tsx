import { FormEvent, useEffect, useState } from 'react';
import ErrorAlert from '../../../components/ErrorAlert';
import { memberName, jobTitleLabel } from '../../../features/teams/teamLabels';
import { useApi } from '../../../hooks';
import {
    Sprint,
    SprintForecast,
    SprintInput,
    TeamMemberInfo,
} from '../../../types';
import ForecastCard from './ForecastCard';

export type SprintFormMode = 'plan' | 'history';

type SprintFormProps = {
    teamId: number;
    members: TeamMemberInfo[];
    /** plan: a sprint still to come; history: one that is over, with its results */
    mode: SprintFormMode;
    /** edits this sprint instead of adding a new one */
    sprint?: Sprint;
    initial?: Partial<SprintInput>;
    onSave: (input: SprintInput) => Promise<boolean>;
    onCancel?: () => void;
};

const toNumber = (value: string) => (value.trim() === '' ? NaN : Number(value));

/** Adds or edits a sprint: dates, who is in it, buffer and what carried over */
const SprintForm = ({
    teamId,
    members,
    mode,
    sprint,
    initial,
    onSave,
    onCancel,
}: SprintFormProps) => {
    const api = useApi();
    const showResults = mode === 'history' || sprint?.status === 'closed';
    const [name, setName] = useState(sprint?.name ?? initial?.name ?? '');
    const [startDate, setStartDate] = useState(
        sprint?.startDate ?? initial?.startDate ?? ''
    );
    const [endDate, setEndDate] = useState(
        sprint?.endDate ?? initial?.endDate ?? ''
    );
    const [memberIds, setMemberIds] = useState<number[]>(
        sprint?.memberIds ?? initial?.memberIds ?? members.map((m) => m.userId)
    );
    const [buffer, setBuffer] = useState(
        String(sprint?.bufferPercent ?? initial?.bufferPercent ?? 10)
    );
    const [carryPoints, setCarryPoints] = useState(
        String(sprint?.carriedOverPoints ?? 0)
    );
    const [carryTickets, setCarryTickets] = useState(
        String(sprint?.carriedOverTickets ?? 0)
    );
    const [planned, setPlanned] = useState(
        sprint?.plannedPoints == null ? '' : String(sprint.plannedPoints)
    );
    const [completed, setCompleted] = useState(
        sprint?.completedPoints == null ? '' : String(sprint.completedPoints)
    );
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [forecast, setForecast] = useState<SprintForecast | null>(null);

    const bufferValue = toNumber(buffer);
    const carryValue = toNumber(carryPoints);
    const datesOk = !!startDate && !!endDate && endDate >= startDate;

    // a live forecast while planning, for the dates and people picked
    useEffect(() => {
        if (
            showResults ||
            !datesOk ||
            !memberIds.length ||
            Number.isNaN(bufferValue) ||
            Number.isNaN(carryValue)
        ) {
            setForecast(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            api.getSprintForecast(teamId, {
                startDate,
                endDate,
                memberIds,
                bufferPercent: bufferValue,
                carriedOverPoints: carryValue,
            })
                .then((f) => !cancelled && setForecast(f))
                .catch(() => !cancelled && setForecast(null));
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        api,
        teamId,
        showResults,
        datesOk,
        startDate,
        endDate,
        memberIds,
        bufferValue,
        carryValue,
    ]);

    const toggle = (userId: number) =>
        setMemberIds((ids) =>
            ids.includes(userId)
                ? ids.filter((id) => id !== userId)
                : [...ids, userId]
        );

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const plannedValue = toNumber(planned);
        const completedValue = toNumber(completed);
        if (!name.trim()) return setError('Please name the sprint.');
        if (!datesOk) {
            return setError('Pick a start date, and an end date after it.');
        }
        if (!memberIds.length) {
            return setError('Pick at least one person for the sprint.');
        }
        if (Number.isNaN(bufferValue) || bufferValue < 0 || bufferValue > 100) {
            return setError('The buffer must be between 0 and 100%.');
        }
        if (Number.isNaN(carryValue) || carryValue < 0) {
            return setError('Carried-over points must be 0 or more.');
        }
        const tickets = toNumber(carryTickets);
        if (
            Number.isNaN(tickets) ||
            tickets < 0 ||
            !Number.isInteger(tickets)
        ) {
            return setError('Carried-over tickets must be a whole number.');
        }
        if (
            showResults &&
            (Number.isNaN(plannedValue) ||
                Number.isNaN(completedValue) ||
                plannedValue < 0 ||
                completedValue < 0)
        ) {
            return setError(
                'Enter the points planned and completed, both 0 or more.'
            );
        }
        setError(null);
        setSaving(true);
        const saved = await onSave({
            name: name.trim(),
            startDate,
            endDate,
            bufferPercent: bufferValue,
            carriedOverPoints: carryValue,
            carriedOverTickets: tickets,
            memberIds,
            ...(showResults
                ? {
                      plannedPoints: plannedValue,
                      completedPoints: completedValue,
                  }
                : sprint?.plannedPoints != null
                  ? { plannedPoints: sprint.plannedPoints }
                  : {}),
        });
        setSaving(false);
        if (!saved) setError('Could not save the sprint. Please try again.');
    };

    return (
        <form
            onSubmit={submit}
            aria-label={sprint ? 'Edit sprint' : 'Add sprint'}
        >
            <ErrorAlert message={error} onDismiss={() => setError(null)} />
            <div className="row g-3">
                <div className="col-md-6">
                    <label htmlFor="sprintName" className="form-label">
                        Sprint name
                    </label>
                    <input
                        id="sprintName"
                        className="form-control"
                        value={name}
                        maxLength={80}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sprint 14"
                    />
                </div>
                <div className="col-6 col-md-3">
                    <label htmlFor="sprintStart" className="form-label">
                        Starts
                    </label>
                    <input
                        id="sprintStart"
                        type="date"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <label htmlFor="sprintEnd" className="form-label">
                        Ends
                    </label>
                    <input
                        id="sprintEnd"
                        type="date"
                        className="form-control"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>

                <div className="col-12">
                    <div className="form-label mb-1">Who is in the sprint</div>
                    <div className="row g-2">
                        {members.map((m) => (
                            <div className="col-sm-6 col-lg-4" key={m.userId}>
                                <div className="form-check">
                                    <input
                                        id={`member-${m.userId}`}
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={memberIds.includes(m.userId)}
                                        onChange={() => toggle(m.userId)}
                                    />
                                    <label
                                        htmlFor={`member-${m.userId}`}
                                        className="form-check-label"
                                    >
                                        {memberName(m)}
                                        {m.jobTitle && (
                                            <span className="small text-secondary">
                                                {' '}
                                                · {jobTitleLabel(m.jobTitle)}
                                            </span>
                                        )}
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-6 col-md-3">
                    <label htmlFor="sprintBuffer" className="form-label">
                        Buffer (%)
                    </label>
                    <input
                        id="sprintBuffer"
                        type="number"
                        min={0}
                        max={100}
                        className="form-control"
                        value={buffer}
                        onChange={(e) => setBuffer(e.target.value)}
                    />
                    <div className="form-text">
                        Held back for bugs and surprises.
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <label htmlFor="carryPoints" className="form-label">
                        Carried-over points
                    </label>
                    <input
                        id="carryPoints"
                        type="number"
                        min={0}
                        step="0.5"
                        className="form-control"
                        value={carryPoints}
                        onChange={(e) => setCarryPoints(e.target.value)}
                    />
                    <div className="form-text">Remaining points only.</div>
                </div>
                <div className="col-6 col-md-3">
                    <label htmlFor="carryTickets" className="form-label">
                        Carried-over tickets
                    </label>
                    <input
                        id="carryTickets"
                        type="number"
                        min={0}
                        step={1}
                        className="form-control"
                        value={carryTickets}
                        onChange={(e) => setCarryTickets(e.target.value)}
                    />
                </div>
                {showResults && (
                    <>
                        <div className="col-6 col-md-3">
                            <label
                                htmlFor="plannedPoints"
                                className="form-label"
                            >
                                Points planned
                            </label>
                            <input
                                id="plannedPoints"
                                type="number"
                                min={0}
                                step="0.5"
                                className="form-control"
                                value={planned}
                                onChange={(e) => setPlanned(e.target.value)}
                            />
                            <div className="form-text">
                                Including carried-over work.
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <label
                                htmlFor="completedPoints"
                                className="form-label"
                            >
                                Points completed
                            </label>
                            <input
                                id="completedPoints"
                                type="number"
                                min={0}
                                step="0.5"
                                className="form-control"
                                value={completed}
                                onChange={(e) => setCompleted(e.target.value)}
                            />
                        </div>
                    </>
                )}
            </div>

            {showResults && (
                <p className="text-secondary small mt-3 mb-0">
                    Leave for these people between those dates counts towards
                    the sprint&apos;s available days, so make sure their annual
                    leave has been added.
                </p>
            )}
            {forecast && (
                <div className="mt-3">
                    <ForecastCard forecast={forecast} />
                </div>
            )}

            <div className="d-flex gap-2 mt-3">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                >
                    {sprint
                        ? 'Save changes'
                        : mode === 'history'
                          ? 'Add past sprint'
                          : 'Create sprint'}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default SprintForm;
