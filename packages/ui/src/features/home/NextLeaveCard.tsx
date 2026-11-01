import { useHolidays } from '../../hooks';
import { paths } from '../../routes';
import {
    dayPartLabels,
    formatDayRange,
    reasonLabels,
} from '../holidays/holidayLabels';
import { daysUntil, nextLeave } from '../holidays/leaveDates';

const countdown = (start: string, end: string, now: Date) => {
    const toStart = daysUntil(start, now);
    if (toStart <= 0) {
        const left = daysUntil(end, now);
        return left === 0
            ? 'Last day today'
            : `Away now, back in ${left + 1} days`;
    }
    return toStart === 1 ? 'Starts tomorrow' : `Starts in ${toStart} days`;
};

/** The user's next planned leave, or a nudge to add some */
const NextLeaveCard = ({ now = new Date() }: { now?: Date }) => {
    const { holidays, loaded } = useHolidays();
    if (!loaded) return null;
    const next = nextLeave(holidays, now);

    return (
        <section aria-labelledby="nextLeaveHeading" className="mb-4">
            <div className="card dashboard-card">
                <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div>
                        <h2
                            id="nextLeaveHeading"
                            className="h6 text-uppercase text-secondary fw-semibold mb-1"
                        >
                            Your next annual leave
                        </h2>
                        {next ? (
                            <>
                                <div className="fw-semibold">
                                    {formatDayRange(
                                        next.startDate,
                                        next.endDate
                                    )}
                                    {next.dayPart !== 'full' && (
                                        <span className="badge text-bg-secondary ms-2">
                                            {dayPartLabels[next.dayPart]}
                                        </span>
                                    )}
                                </div>
                                <div className="text-secondary small">
                                    {reasonLabels[next.reason]} ·{' '}
                                    {countdown(
                                        next.startDate,
                                        next.endDate,
                                        now
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-secondary">
                                No leave planned yet.
                            </div>
                        )}
                    </div>
                    <a
                        className="btn btn-outline-primary btn-sm"
                        href={paths.holidays}
                    >
                        {next ? 'Manage leave' : 'Add leave'}
                    </a>
                </div>
            </div>
        </section>
    );
};

export default NextLeaveCard;
