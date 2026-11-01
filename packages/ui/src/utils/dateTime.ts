const pad = (n: number) => String(n).padStart(2, '0');

/** A date as the local-time value a datetime-local input expects, e.g. 2030-05-01T09:30 */
export const toLocalInputValue = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** The next half hour, a sensible starting point for a planning session */
export const defaultSchedule = (now = new Date()): string => {
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() < 30 ? 30 : 60);
    return toLocalInputValue(next);
};

/** What a datetime-local input holds, as an ISO timestamp, or null when it is empty or invalid */
export const fromLocalInputValue = (value: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** e.g. "Thu 1 May, 09:30", with the year when it is not this one */
export const formatSchedule = (iso: string, now = new Date()): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
        hour: '2-digit',
        minute: '2-digit',
    });
};

const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Tomorrow" or e.g. "Thu 1 May" (with the year when it is not this one) */
export const dayLabel = (iso: string, now = new Date()): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
    });
};

/** e.g. "09:30" */
export const formatTime = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
};
