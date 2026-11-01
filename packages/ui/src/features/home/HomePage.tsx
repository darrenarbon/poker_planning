import { useAuth0 } from '@auth0/auth0-react';
import { apps } from '../../apps';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useLogin } from '../../hooks';
import AppTile from './AppTile';

const AppTiles = () => (
    <div className="row g-4">
        {apps.map((app) => (
            <div key={app.id} className="col-md-6 col-lg-4">
                <AppTile app={app} />
            </div>
        ))}
    </div>
);

/** The landing page: every app in Teamdeck, and a login prompt for visitors */
const HomePage = () => {
    const { user, isAuthenticated, isLoading } = useAuth0();
    const login = useLogin();

    const renderContent = () => {
        if (isLoading) {
            return <Loading />;
        }
        if (!isAuthenticated) {
            return (
                <>
                    <header className="home-hero text-center py-5">
                        <h1 className="display-5 fw-bold">
                            Welcome to Teamdeck
                        </h1>
                        <p className="lead text-secondary mx-auto welcome-lead">
                            A toolkit for agile teams: estimate tickets, plan
                            your sprints and keep track of who knows what.
                        </p>
                        <button
                            className="btn btn-primary btn-lg px-5 mt-2"
                            type="button"
                            onClick={login}
                        >
                            Log in to get started
                        </button>
                    </header>
                    <AppTiles />
                </>
            );
        }
        return (
            <>
                <header className="mb-4">
                    <h1 className="h3 fw-bold mb-1">
                        Welcome back
                        {user?.given_name ? `, ${user.given_name}` : ''}
                    </h1>
                    <p className="text-secondary mb-0">
                        What are we working on today?
                    </p>
                </header>
                <AppTiles />
            </>
        );
    };

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <div className="dashboard">{renderContent()}</div>
            </div>
        </>
    );
};

export default HomePage;
