import { FormEvent, useState } from 'react';
import {
    dayPartLabels,
    reasonOptions,
} from '../../../features/holidays/holidayLabels';
import { useApi } from '../../../hooks';
import { HolidayDayPart, HolidayReason } from '../../../types';

type QuickLeaveProps = {
    userId: number;
    name: string;
    /** the sprint's dates, which the leave starts out covering */
    startDate: string;
    endDate: string;
    onAdded: () => void;
    onClose: () => void;
};

/** Adds one piece of leave for someone without leaving the sprint form */
const QuickLeave = ({
    userId,
    name,
    startDate,
    endDate,
    onAdded,
    onClose,
}: QuickLeaveProps) => {
    const api = useApi();
    const [from, setFrom] = useState(startDate);
    const [to, setTo] = useState(startDate);
    const [dayPart, setDayPart] = useState<HolidayDayPart>('full');
    const [reason, setReason] = useState<HolidayReason>('annual_leave');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = async (e: FormEvent) => {
        // nested in the sprint form, so must not submit it
        e.preventDefault();
        e.stopPropagation();
        if (!from || !to || to < from) {
            setError('Pick a start date, and an end date on or after it.');
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await api.addHoliday(
                { startDate: from, endDate: to, dayPart, reason },
                userId
            );
            onAdded();
        } catch (error) {
            console.error('Failed to add leave:', error);
            setError('Could not add the leave. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="border rounded p-3 mt-2 bg-body-tertiary"
            role="group"
            aria-label={`Add leave for ${name}`}
        >
            <div className="row g-2 align-items-end">
                <div className="col-6 col-md-3">
                    <label
                        htmlFor={`leaveFrom-${userId}`}
                        className="form-label small mb-1"
                    >
                        Leave from
                    </label>
                    <input
                        id={`leaveFrom-${userId}`}
                        type="date"
                        className="form-control form-control-sm"
                        value={from}
                        min={startDate}
                        max={endDate}
                        onChange={(e) => {
                            setFrom(e.target.value);
                            if (to < e.target.value) setTo(e.target.value);
                        }}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <label
                        htmlFor={`leaveTo-${userId}`}
                        className="form-label small mb-1"
                    >
                        To
                    </label>
                    <input
                        id={`leaveTo-${userId}`}
                        type="date"
                        className="form-control form-control-sm"
                        value={to}
                        min={from || startDate}
                        max={endDate}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <label
                        htmlFor={`leavePart-${userId}`}
                        className="form-label small mb-1"
                    >
                        Days
                    </label>
                    <select
                        id={`leavePart-${userId}`}
                        className="form-select form-select-sm"
                        value={dayPart}
                        onChange={(e) =>
                            setDayPart(e.target.value as HolidayDayPart)
                        }
                    >
                        {Object.entries(dayPartLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-6 col-md-3">
                    <label
                        htmlFor={`leaveReason-${userId}`}
                        className="form-label small mb-1"
                    >
                        Reason
                    </label>
                    <select
                        id={`leaveReason-${userId}`}
                        className="form-select form-select-sm"
                        value={reason}
                        onChange={(e) =>
                            setReason(e.target.value as HolidayReason)
                        }
                    >
                        {reasonOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {error && (
                <div className="text-danger small mt-2" role="alert">
                    {error}
                </div>
            )}
            <div className="d-flex gap-2 mt-2">
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={saving}
                    onClick={submit}
                >
                    Add leave
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default QuickLeave;
