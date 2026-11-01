import { FormEvent, useEffect, useState } from 'react';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import { NO_IDEA_VOTE, votingValues } from '../../apps/planningPoker/constants';
import { Theme, useUserSettings } from '../../hooks';
import { Exemplar } from '../../types';
import { normaliseBaseUrl } from '../../utils';

const estimates = votingValues.filter((v) => v.value !== NO_IDEA_VOTE);

const themeOptions: [value: Theme | '', label: string][] = [
    ['', 'Match my device'],
    ['light', 'Light'],
    ['dark', 'Dark'],
];

/** The user's Planning Poker defaults: base URL for new rooms, theme and exemplar tickets */
const PlanningPokerSettings = () => {
    const { settings, loaded, error, save } = useUserSettings();
    const [baseUrl, setBaseUrl] = useState('');
    const [theme, setTheme] = useState<Theme | ''>('');
    const [exemplars, setExemplars] = useState<Exemplar[]>([]);
    const [newEstimate, setNewEstimate] = useState(estimates[0].value);
    const [newTicket, setNewTicket] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setBaseUrl(settings.defaultBaseUrl ?? '');
        setTheme(settings.theme ?? '');
        setExemplars(settings.exemplars ?? []);
    }, [settings]);

    const changed = () => setSaved(false);

    const addExemplar = () => {
        const ticketNumber = newTicket.trim();
        if (!ticketNumber) return;
        setExemplars((prev) =>
            [...prev, { estimate: newEstimate, ticketNumber }].sort(
                (a, b) => a.estimate - b.estimate
            )
        );
        setNewTicket('');
        changed();
    };

    const removeExemplar = (index: number) => {
        setExemplars((prev) => prev.filter((_, i) => i !== index));
        changed();
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const ok = await save({
            defaultBaseUrl: baseUrl.trim()
                ? normaliseBaseUrl(baseUrl)
                : undefined,
            theme: theme || undefined,
            exemplars,
        });
        setSaved(ok);
    };

    return (
        <section aria-labelledby="planning-poker-settings">
            <h2 className="h4 fw-bold mb-3" id="planning-poker-settings">
                Planning Poker
            </h2>
            {!loaded ? (
                <Loading />
            ) : (
                <form onSubmit={onSubmit}>
                    <ErrorAlert message={error} />

                    <section className="card dashboard-card mb-3">
                        <div className="card-body">
                            <h3 className="h5 fw-semibold">New rooms</h3>
                            <label
                                htmlFor="defaultBaseUrl"
                                className="form-label"
                            >
                                Default base URL for tickets
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="defaultBaseUrl"
                                value={baseUrl}
                                onChange={(e) => {
                                    setBaseUrl(e.target.value);
                                    changed();
                                }}
                                placeholder="e.g. https://your-company.atlassian.net/browse"
                            />
                            <div className="form-text">
                                Filled in for you when you create a room. Leave
                                blank to type it each time.
                            </div>
                        </div>
                    </section>

                    <section className="card dashboard-card mb-3">
                        <div className="card-body">
                            <h3 className="h5 fw-semibold">Appearance</h3>
                            <fieldset>
                                <legend className="form-label fs-6">
                                    Default theme
                                </legend>
                                {themeOptions.map(([value, label]) => (
                                    <div
                                        key={value}
                                        className="form-check form-check-inline"
                                    >
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="theme"
                                            id={`theme-${value || 'device'}`}
                                            checked={theme === value}
                                            onChange={() => {
                                                setTheme(value);
                                                changed();
                                            }}
                                        />
                                        <label
                                            className="form-check-label"
                                            htmlFor={`theme-${value || 'device'}`}
                                        >
                                            {label}
                                        </label>
                                    </div>
                                ))}
                            </fieldset>
                            <div className="form-text">
                                The sun and moon button still switches for the
                                visit.
                            </div>
                        </div>
                    </section>

                    <section className="card dashboard-card mb-3">
                        <div className="card-body">
                            <h3 className="h5 fw-semibold">Exemplar tickets</h3>
                            <p className="text-secondary small">
                                Link past tickets to an estimate so voters can
                                see what a 1, 3 or 5 looks like. They appear on
                                the voting page of rooms you own.
                            </p>
                            {exemplars.length > 0 && (
                                <ul className="list-group mb-3">
                                    {exemplars.map((ex, i) => (
                                        <li
                                            key={`${ex.estimate}-${ex.ticketNumber}-${i}`}
                                            className="list-group-item d-flex align-items-center gap-3"
                                        >
                                            <span className="badge text-bg-primary">
                                                {ex.estimate}
                                            </span>
                                            <span className="flex-grow-1">
                                                {ex.ticketNumber}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() =>
                                                    removeExemplar(i)
                                                }
                                                aria-label={`Remove ${ex.ticketNumber}`}
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="row g-2 align-items-end">
                                <div className="col-4 col-md-3">
                                    <label
                                        htmlFor="exemplarEstimate"
                                        className="form-label"
                                    >
                                        Estimate
                                    </label>
                                    <select
                                        id="exemplarEstimate"
                                        className="form-select"
                                        value={newEstimate}
                                        onChange={(e) =>
                                            setNewEstimate(
                                                Number(e.target.value)
                                            )
                                        }
                                    >
                                        {estimates.map((v) => (
                                            <option
                                                key={v.value}
                                                value={v.value}
                                            >
                                                {v.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col">
                                    <label
                                        htmlFor="exemplarTicket"
                                        className="form-label"
                                    >
                                        Ticket
                                    </label>
                                    <input
                                        id="exemplarTicket"
                                        type="text"
                                        className="form-control"
                                        value={newTicket}
                                        onChange={(e) =>
                                            setNewTicket(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addExemplar();
                                            }
                                        }}
                                        placeholder="e.g. PP-123"
                                    />
                                </div>
                                <div className="col-auto">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={addExemplar}
                                        disabled={!newTicket.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="d-flex align-items-center gap-3">
                        <button type="submit" className="btn btn-primary">
                            Save settings
                        </button>
                        {saved && (
                            <span className="text-success small" role="status">
                                Saved
                            </span>
                        )}
                    </div>
                </form>
            )}
        </section>
    );
};

export default PlanningPokerSettings;
