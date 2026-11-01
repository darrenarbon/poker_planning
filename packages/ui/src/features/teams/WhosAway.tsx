import { useEffect, useState } from 'react';
import { useApi } from '../../hooks';
import { TeamLeave, TeamMemberInfo } from '../../types';
import {
    dayPartLabels,
    formatDayRange,
    reasonLabels,
} from '../holidays/holidayLabels';
import { addDays, toDay } from '../holidays/leaveDates';
import { memberName } from './teamLabels';

const WINDOW_DAYS = 28;

type WhosAwayProps = {
    teamId: number;
    members: TeamMemberInfo[];
    now?: Date;
};

/** Who in the team is away now or in the next four weeks */
const WhosAway = ({ teamId, members, now = new Date() }: WhosAwayProps) => {
    const api = useApi();
    const [leave, setLeave] = useState<TeamLeave[]>();
    const [failed, setFailed] = useState(false);
    const today = toDay(now);

    useEffect(() => {
        let cancelled = false;
        api.getTeamLeave(teamId, today, addDays(today, WINDOW_DAYS))
            .then((list) => !cancelled && setLeave(list))
            .catch((error) => {
                console.error('Failed to load who is away:', error);
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [api, teamId, today]);

    const people = new Map(members.map((m) => [m.sub, m]));

    return (
        <section className="mb-5" aria-labelledby="whosAwayHeading">
            <h2 id="whosAwayHeading" className="h5 fw-bold mb-3">
                Who&apos;s away
            </h2>
            {failed ? (
                <p className="text-secondary">Could not load who is away.</p>
            ) : !leave ? null : leave.length === 0 ? (
                <p className="text-secondary">
                    Nobody has leave in the next four weeks.
                </p>
            ) : (
                <ul className="list-group">
                    {leave.map((l) => {
                        const person = people.get(l.sub);
                        return (
                            <li
                                key={l.holidayId}
                                className="list-group-item d-flex flex-wrap align-items-center gap-2"
                            >
                                <div className="flex-grow-1">
                                    <span className="fw-semibold">
                                        {person
                                            ? memberName(person)
                                            : 'Unknown'}
                                    </span>
                                    {l.startDate <= today && (
                                        <span className="badge text-bg-warning ms-2">
                                            Away now
                                        </span>
                                    )}
                                    <div className="text-secondary small">
                                        {formatDayRange(l.startDate, l.endDate)}
                                        {l.dayPart !== 'full' &&
                                            ` (${dayPartLabels[l.dayPart].toLowerCase()})`}
                                        {' · '}
                                        {reasonLabels[l.reason]}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

export default WhosAway;
