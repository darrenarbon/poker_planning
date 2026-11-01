import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import { useUserRooms } from '../../apps/planningPoker/hooks';
import { pokerPaths } from '../../apps/planningPoker/routes';
import { useMyTeams } from '../../hooks';
import UpcomingSessions from './UpcomingSessions';

type DashboardProps = { givenName?: string };

/**
 * The logged-in homepage: what is coming up and a way to start something.
 * Each app adds its own panels here as it becomes available.
 */
const Dashboard = ({ givenName }: DashboardProps) => {
    const { rooms, loaded, error } = useUserRooms();
    const { teams } = useMyTeams();
    const teamNames = Object.fromEntries(teams.map((t) => [t.team_id, t.name]));

    return (
        <>
            <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h1 className="h3 fw-bold mb-1">
                        Welcome back{givenName ? `, ${givenName}` : ''}
                    </h1>
                    <p className="text-secondary mb-0">
                        Here is what is coming up.
                    </p>
                </div>
                <a className="btn btn-primary" href={pokerPaths.newRoom}>
                    New room
                </a>
            </header>
            <ErrorAlert message={error} />
            {loaded ? (
                <UpcomingSessions rooms={rooms} teamNames={teamNames} />
            ) : (
                <Loading />
            )}
        </>
    );
};

export default Dashboard;
