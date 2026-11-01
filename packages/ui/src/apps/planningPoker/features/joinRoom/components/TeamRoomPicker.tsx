import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { useApi } from '../../../../../hooks';
import {
    NewRoomOptions,
    TeamAbsence,
    TeamMemberInfo,
    UserTeam,
} from '../../../../../types';
import { memberName } from '../../../../../features/teams/teamLabels';
import {
    dayPartLabels,
    reasonLabels,
    sessionDayAndPart,
} from '../../../../../features/holidays/holidayLabels';

type TeamRoomPickerProps = {
    teams: UserTeam[];
    /** when the session happens, as a datetime-local value, to flag who is away */
    scheduledAt: string;
    /** the team and people chosen, or undefined for a room with no team */
    onChange: (options: NewRoomOptions | undefined) => void;
};

const absenceLabel = (absence: TeamAbsence) =>
    absence.dayPart === 'full'
        ? reasonLabels[absence.reason]
        : `${reasonLabels[absence.reason]}, ${dayPartLabels[absence.dayPart].toLowerCase()}`;

/** Pick a team for a new room, then who from it to bring in and who co-facilitates */
const TeamRoomPicker = ({
    teams,
    scheduledAt,
    onChange,
}: TeamRoomPickerProps) => {
    const { user } = useAuth0();
    const api = useApi();
    const [teamId, setTeamId] = useState('');
    const [members, setMembers] = useState<TeamMemberInfo[]>([]);
    const [added, setAdded] = useState<Set<string>>(new Set());
    const [facilitators, setFacilitators] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [absences, setAbsences] = useState<Map<string, TeamAbsence>>(
        new Map()
    );
    // people whose box the user has ticked or unticked themselves
    const [touched, setTouched] = useState<Set<string>>(new Set());

    // everyone in the team starts ticked, apart from the person creating it
    useEffect(() => {
        setMembers([]);
        setAdded(new Set());
        setFacilitators(new Set());
        setTouched(new Set());
        setError(null);
        if (!teamId) return;
        let cancelled = false;
        api.getTeam(teamId)
            .then(({ members }) => {
                if (cancelled) return;
                const others = members.filter((m) => m.sub !== user?.sub);
                setMembers(others);
                setAdded(new Set(others.map((m) => m.sub)));
            })
            .catch((error) => {
                console.error('Failed to load team members:', error);
                if (!cancelled) setError('Could not load that team.');
            });
        return () => {
            cancelled = true;
        };
    }, [api, teamId, user?.sub]);

    // who is away when the session happens; a failure just means no flags
    useEffect(() => {
        setAbsences(new Map());
        const session = sessionDayAndPart(scheduledAt);
        if (!teamId || !session) return;
        let cancelled = false;
        Promise.resolve()
            .then(() => api.getTeamAbsences(teamId, session.date, session.part))
            .then((list) => {
                if (!cancelled)
                    setAbsences(new Map(list.map((a) => [a.sub, a])));
            })
            .catch((error) => {
                console.error('Failed to load who is away:', error);
            });
        return () => {
            cancelled = true;
        };
    }, [api, teamId, scheduledAt]);

    // people who are away start unticked, unless the user has chosen for them
    useEffect(() => {
        setAdded((current) => {
            const next = new Set(current);
            for (const m of members) {
                if (touched.has(m.sub)) continue;
                if (absences.has(m.sub)) next.delete(m.sub);
                else next.add(m.sub);
            }
            return next.size === current.size &&
                [...next].every((sub) => current.has(sub))
                ? current
                : next;
        });
        setFacilitators((current) => {
            const next = new Set(
                [...current].filter(
                    (sub) => touched.has(sub) || !absences.has(sub)
                )
            );
            return next.size === current.size ? current : next;
        });
    }, [absences, members, touched]);

    useEffect(() => {
        onChange(
            teamId
                ? {
                      teamId: Number(teamId),
                      memberSubs: [...added],
                      coFacilitatorSubs: [...facilitators],
                  }
                : undefined
        );
    }, [teamId, added, facilitators, onChange]);

    const toggle = (
        set: Set<string>,
        update: (next: Set<string>) => void,
        sub: string
    ) => {
        const next = new Set(set);
        if (!next.delete(sub)) next.add(sub);
        update(next);
    };

    const markTouched = (sub: string) =>
        setTouched((current) => new Set(current).add(sub));

    const toggleAdded = (sub: string) => {
        markTouched(sub);
        toggle(added, setAdded, sub);
        // co-facilitators have to be in the room
        if (added.has(sub) && facilitators.has(sub)) {
            toggle(facilitators, setFacilitators, sub);
        }
    };

    const toggleFacilitator = (sub: string) => {
        markTouched(sub);
        toggle(facilitators, setFacilitators, sub);
        if (!added.has(sub)) toggle(added, setAdded, sub);
    };

    return (
        <div className="col-12">
            <label htmlFor="roomTeam" className="form-label">
                Team
            </label>
            <select
                id="roomTeam"
                className="form-select"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
            >
                <option value="">
                    No team (anyone with the link can join)
                </option>
                {teams.map((team) => (
                    <option key={team.team_id} value={team.team_id}>
                        {team.name}
                    </option>
                ))}
            </select>
            <div className="form-text">
                People who are away when the session is on start unticked; you
                can still add them. A team room shows up in its members&apos;
                lists, and the team&apos;s owner and admins can manage it.
            </div>
            {error && <div className="text-danger small mt-2">{error}</div>}
            {members.length > 0 && (
                <fieldset className="mt-3">
                    <legend className="form-label">
                        Add people from the team
                    </legend>
                    <ul className="list-group">
                        {members.map((m) => (
                            <li
                                key={m.sub}
                                className="list-group-item d-flex flex-wrap align-items-center gap-3"
                            >
                                <div className="form-check flex-grow-1 mb-0">
                                    <input
                                        id={`add-${m.sub}`}
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={added.has(m.sub)}
                                        onChange={() => toggleAdded(m.sub)}
                                    />
                                    <label
                                        className="form-check-label"
                                        htmlFor={`add-${m.sub}`}
                                    >
                                        {memberName(m)}
                                    </label>
                                    {absences.has(m.sub) && (
                                        <span className="badge text-bg-warning ms-2">
                                            Away:{' '}
                                            {absenceLabel(absences.get(m.sub)!)}
                                        </span>
                                    )}
                                </div>
                                <div className="form-check mb-0">
                                    <input
                                        id={`co-${m.sub}`}
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={facilitators.has(m.sub)}
                                        onChange={() =>
                                            toggleFacilitator(m.sub)
                                        }
                                    />
                                    <label
                                        className="form-check-label small"
                                        htmlFor={`co-${m.sub}`}
                                    >
                                        Co-facilitator
                                    </label>
                                </div>
                            </li>
                        ))}
                    </ul>
                </fieldset>
            )}
        </div>
    );
};

export default TeamRoomPicker;
