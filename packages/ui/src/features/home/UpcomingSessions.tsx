import { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { pokerPaths, roomVotingPath } from '../../apps/planningPoker/routes';
import { RoomSummary } from '../../types';
import { formatTime } from '../../utils';
import { groupByDay, isHappeningNow, upcomingSessions } from './upcoming';

const MAX_SESSIONS = 8;

type UpcomingSessionsProps = {
    rooms: RoomSummary[];
    /** team names by id, to label rooms that belong to a team */
    teamNames?: Record<number, string>;
    now?: Date;
};

/** The planning sessions coming up, soonest first, grouped by day */
const UpcomingSessions = ({
    rooms,
    teamNames = {},
    now = new Date(),
}: UpcomingSessionsProps) => {
    const navigate = useNavigate();
    const all = upcomingSessions(rooms, now);
    const shown = all.slice(0, MAX_SESSIONS);

    const goToRoom = (roomName: string) => (e: MouseEvent) => {
        e.preventDefault();
        navigate(roomVotingPath(roomName));
    };

    return (
        <section aria-labelledby="upcomingHeading">
            <div className="d-flex align-items-baseline justify-content-between mb-2">
                <h2 id="upcomingHeading" className="h5 fw-bold mb-0">
                    Upcoming planning
                </h2>
                <a className="small" href={pokerPaths.home}>
                    All rooms
                </a>
            </div>
            {shown.length === 0 ? (
                <div className="card border-0 bg-body-tertiary text-center text-secondary p-4 mt-3">
                    Nothing is planned. Rooms you create or are added to will
                    show up here once they have a date coming up.
                </div>
            ) : (
                groupByDay(shown, now).map(([day, sessions]) => (
                    <div key={day}>
                        <h3 className="small text-uppercase text-secondary fw-semibold mt-4 mb-2">
                            {day}
                        </h3>
                        <ul className="list-group">
                            {sessions.map((room) => (
                                <li
                                    key={room.room_id}
                                    className="list-group-item p-0"
                                >
                                    <a
                                        href={roomVotingPath(room.room_name)}
                                        className="d-flex align-items-center gap-3 px-3 py-2 text-decoration-none text-body"
                                        onClick={goToRoom(room.room_name)}
                                    >
                                        <time
                                            dateTime={room.scheduled_at}
                                            className="fw-semibold text-nowrap upcoming-time"
                                        >
                                            {formatTime(room.scheduled_at!)}
                                        </time>
                                        <span className="flex-grow-1 min-w-0">
                                            <span className="fw-semibold">
                                                {room.friendly_name}
                                            </span>
                                            {room.team_id != null &&
                                                teamNames[room.team_id] && (
                                                    <span className="badge text-bg-info ms-2">
                                                        {
                                                            teamNames[
                                                                room.team_id
                                                            ]
                                                        }
                                                    </span>
                                                )}
                                        </span>
                                        {isHappeningNow(room, now) && (
                                            <span className="badge text-bg-success">
                                                Now
                                            </span>
                                        )}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            )}
            {all.length > shown.length && (
                <p className="small text-secondary mt-3 mb-0">
                    And {all.length - shown.length} more.{' '}
                    <a href={pokerPaths.home}>See all rooms</a>
                </p>
            )}
        </section>
    );
};

export default UpcomingSessions;
