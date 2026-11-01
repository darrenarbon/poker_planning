import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useMyTeams } from '../../hooks';
import { paths } from '../../routes';
import { capacityTeamPath } from './routes';

/** Sprint capacity planner's start: pick a team to plan for */
const SprintCapacityPage = () => {
    const { teams, loaded, error } = useMyTeams();

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <div className="dashboard">
                    <a className="small" href={paths.home}>
                        &larr; Dashboard
                    </a>
                    <header className="mt-2 mb-4">
                        <h1 className="h3 fw-bold mb-1">
                            Sprint capacity planner
                        </h1>
                        <p className="text-secondary mb-0">
                            Work out how many points the next sprint can hold,
                            from past velocity and who is away.
                        </p>
                    </header>
                    <ErrorAlert message={error} />
                    {!loaded ? (
                        <Loading />
                    ) : teams.length === 0 ? (
                        <div className="card border-0 bg-body-tertiary text-center text-secondary p-4">
                            Sprints belong to a team.{' '}
                            <a href={paths.teams}>Start or join a team</a> to
                            begin.
                        </div>
                    ) : (
                        <div className="row g-3">
                            {teams.map((team) => (
                                <div
                                    className="col-sm-6 col-lg-4"
                                    key={team.team_id}
                                >
                                    <a
                                        href={capacityTeamPath(team.team_id)}
                                        className="card h-100 dashboard-card text-decoration-none"
                                    >
                                        <div className="card-body">
                                            <h2 className="h6 fw-bold text-body mb-1">
                                                {team.name}
                                            </h2>
                                            <div className="small text-secondary">
                                                {team.member_count}{' '}
                                                {team.member_count === 1
                                                    ? 'person'
                                                    : 'people'}
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SprintCapacityPage;
