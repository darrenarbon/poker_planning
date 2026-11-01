import { FormEvent, useState } from 'react';
import ErrorAlert from '../../components/ErrorAlert';
import { useConfirm, useHolidays } from '../../hooks';
import {
    BANK_HOLIDAY_REGIONS,
    BankHolidayRegion,
    Holiday,
    HolidayDayPart,
    HolidayReason,
} from '../../types';
import {
    dayPartLabels,
    formatDayRange,
    reasonLabels,
    reasonOptions,
    regionLabels,
    spainSubdivisions,
} from './holidayLabels';

const today = () => new Date().toLocaleDateString('en-CA');

interface FormState {
    startDate: string;
    endDate: string;
    dayPart: HolidayDayPart;
    reason: HolidayReason;
    note: string;
}

const blankForm = (): FormState => ({
    startDate: today(),
    endDate: today(),
    dayPart: 'full',
    reason: 'annual_leave',
    note: '',
});

type HolidaysPanelProps = {
    /** whose leave to manage: someone else's when an owner or admin acts for them */
    userId?: number;
    heading?: string;
};

/** Lets the user add, change and remove their own time off, or someone else's */
const HolidaysPanel = ({
    userId,
    heading = 'Annual leave',
}: HolidaysPanelProps) => {
    const { holidays, loaded, error, add, update, remove, importBankHolidays } =
        useHolidays(userId);
    const [form, setForm] = useState<FormState>(blankForm);
    const [editing, setEditing] = useState<number | null>(null);
    const [region, setRegion] =
        useState<BankHolidayRegion>('england-and-wales');
    const [subdivision, setSubdivision] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [confirm, confirmModal] = useConfirm();

    const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setMessage(null);
        setForm((current) => ({ ...current, [key]: value }));
    };

    const reset = () => {
        setEditing(null);
        setForm(blankForm());
    };

    const startEdit = (holiday: Holiday) => {
        setMessage(null);
        setEditing(holiday.holidayId);
        setForm({
            startDate: holiday.startDate,
            endDate: holiday.endDate,
            dayPart: holiday.dayPart,
            reason: holiday.reason,
            note: holiday.note ?? '',
        });
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const input = { ...form, note: form.note.trim() || undefined };
        const saved =
            editing === null ? await add(input) : await update(editing, input);
        if (saved) {
            setMessage(editing === null ? 'Leave added' : 'Leave saved');
            reset();
        }
    };

    const onImport = async () => {
        const added = await importBankHolidays(
            region,
            region === 'spain' && subdivision ? subdivision : undefined
        );
        if (added !== null) {
            setMessage(
                added
                    ? `Added ${added} bank holiday${added === 1 ? '' : 's'}`
                    : 'Your bank holidays are already up to date'
            );
        }
    };

    const onRemove = (holiday: Holiday) =>
        confirm({
            title: 'Delete leave',
            message: `Delete ${reasonLabels[holiday.reason].toLowerCase()} on ${formatDayRange(holiday.startDate, holiday.endDate)}?`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                if (await remove(holiday.holidayId)) {
                    if (editing === holiday.holidayId) reset();
                    setMessage('Leave deleted');
                }
            },
        });

    const todayValue = today();
    const upcoming = holidays.filter((h) => h.endDate >= todayValue);
    const past = holidays.filter((h) => h.endDate < todayValue);

    const row = (holiday: Holiday) => (
        <li
            key={holiday.holidayId}
            className="list-group-item d-flex flex-wrap align-items-center gap-2"
        >
            <div className="flex-grow-1">
                <div className="fw-semibold">
                    {formatDayRange(holiday.startDate, holiday.endDate)}
                    {holiday.dayPart !== 'full' && (
                        <span className="badge text-bg-secondary ms-2">
                            {dayPartLabels[holiday.dayPart]}
                        </span>
                    )}
                </div>
                <div className="text-secondary small">
                    {reasonLabels[holiday.reason]}
                    {holiday.note && ` · ${holiday.note}`}
                </div>
            </div>
            <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                aria-label={`Edit ${reasonLabels[holiday.reason]} from ${holiday.startDate}`}
                onClick={() => startEdit(holiday)}
            >
                Edit
            </button>
            <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                aria-label={`Delete ${reasonLabels[holiday.reason]} from ${holiday.startDate}`}
                onClick={() => onRemove(holiday)}
            >
                Delete
            </button>
        </li>
    );

    return (
        <section aria-labelledby="holiday-settings" className="mb-5">
            <h2 className="h4 fw-bold mb-3" id="holiday-settings">
                {heading}
            </h2>
            <ErrorAlert message={error} />
            {confirmModal}
            <form onSubmit={onSubmit}>
                <div className="card dashboard-card mb-3">
                    <div className="card-body">
                        <h3 className="h5 fw-semibold">
                            {editing === null ? 'Add leave' : 'Edit leave'}
                        </h3>
                        <p className="text-secondary small">
                            Teammates who are away are left out of new rooms by
                            default when a team session falls on their day.
                        </p>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label
                                    htmlFor="holidayStart"
                                    className="form-label"
                                >
                                    From
                                </label>
                                <input
                                    type="date"
                                    id="holidayStart"
                                    className="form-control"
                                    value={form.startDate}
                                    required
                                    onChange={(e) => {
                                        set('startDate', e.target.value);
                                        // keep the range valid as the start moves
                                        if (e.target.value > form.endDate) {
                                            set('endDate', e.target.value);
                                        }
                                    }}
                                />
                            </div>
                            <div className="col-md-6">
                                <label
                                    htmlFor="holidayEnd"
                                    className="form-label"
                                >
                                    To (inclusive)
                                </label>
                                <input
                                    type="date"
                                    id="holidayEnd"
                                    className="form-control"
                                    value={form.endDate}
                                    min={form.startDate}
                                    required
                                    onChange={(e) =>
                                        set('endDate', e.target.value)
                                    }
                                />
                            </div>
                            <div className="col-md-6">
                                <label
                                    htmlFor="holidayDayPart"
                                    className="form-label"
                                >
                                    Length of each day
                                </label>
                                <select
                                    id="holidayDayPart"
                                    className="form-select"
                                    value={form.dayPart}
                                    onChange={(e) =>
                                        set(
                                            'dayPart',
                                            e.target.value as HolidayDayPart
                                        )
                                    }
                                >
                                    {(
                                        Object.keys(
                                            dayPartLabels
                                        ) as HolidayDayPart[]
                                    ).map((part) => (
                                        <option key={part} value={part}>
                                            {dayPartLabels[part]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label
                                    htmlFor="holidayReason"
                                    className="form-label"
                                >
                                    Reason
                                </label>
                                <select
                                    id="holidayReason"
                                    className="form-select"
                                    value={form.reason}
                                    onChange={(e) =>
                                        set(
                                            'reason',
                                            e.target.value as HolidayReason
                                        )
                                    }
                                >
                                    {reasonOptions.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-12">
                                <label
                                    htmlFor="holidayNote"
                                    className="form-label"
                                >
                                    Note (optional)
                                </label>
                                <input
                                    type="text"
                                    id="holidayNote"
                                    className="form-control"
                                    value={form.note}
                                    maxLength={200}
                                    onChange={(e) =>
                                        set('note', e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-3 mb-4">
                    <button type="submit" className="btn btn-primary">
                        {editing === null ? 'Add leave' : 'Save leave'}
                    </button>
                    {editing !== null && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={reset}
                        >
                            Cancel
                        </button>
                    )}
                    {message && (
                        <span className="text-success small" role="status">
                            {message}
                        </span>
                    )}
                </div>
            </form>

            <div className="card dashboard-card mb-3">
                <div className="card-body">
                    <h3 className="h5 fw-semibold">Bank holidays</h3>
                    <p className="text-secondary small">
                        Fetch official public holidays for your region (UK,
                        Spain or India). Days you already have are skipped, so
                        it is safe to run again.
                    </p>
                    <div className="d-flex flex-wrap align-items-end gap-3">
                        <div>
                            <label
                                htmlFor="bankHolidayRegion"
                                className="form-label"
                            >
                                Region
                            </label>
                            <select
                                id="bankHolidayRegion"
                                className="form-select"
                                value={region}
                                onChange={(e) =>
                                    setRegion(
                                        e.target.value as BankHolidayRegion
                                    )
                                }
                            >
                                {BANK_HOLIDAY_REGIONS.map((r) => (
                                    <option key={r} value={r}>
                                        {regionLabels[r]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {region === 'spain' && (
                            <div>
                                <label
                                    htmlFor="bankHolidaySubdivision"
                                    className="form-label"
                                >
                                    Community
                                </label>
                                <select
                                    id="bankHolidaySubdivision"
                                    className="form-select"
                                    value={subdivision}
                                    onChange={(e) =>
                                        setSubdivision(e.target.value)
                                    }
                                >
                                    <option value="">National only</option>
                                    {Object.entries(spainSubdivisions).map(
                                        ([code, name]) => (
                                            <option key={code} value={code}>
                                                {name}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={onImport}
                        >
                            Add bank holidays
                        </button>
                    </div>
                </div>
            </div>

            <h3 className="h5 fw-semibold">Upcoming</h3>
            {!loaded ? null : upcoming.length ? (
                <ul className="list-group mb-3">{upcoming.map(row)}</ul>
            ) : (
                <p className="text-secondary">No upcoming leave.</p>
            )}
            {past.length > 0 && (
                <details>
                    <summary className="text-secondary">
                        Past ({past.length})
                    </summary>
                    <ul className="list-group mt-2">
                        {[...past].reverse().map(row)}
                    </ul>
                </details>
            )}
        </section>
    );
};

export default HolidaysPanel;
