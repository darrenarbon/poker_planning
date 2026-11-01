import { useAuth0 } from '@auth0/auth0-react';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useLogin, useProfile } from '../../hooks';
import { AppTiles } from './AppTile';
import Dashboard from './Dashboard';

/** The landing page: every app in Teamdeck, and a login prompt for visitors */
const HomePage = () => {
    const { user, isAuthenticated, isLoading } = useAuth0();
    const login = useLogin();
    const { profile } = useProfile();

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
        return <Dashboard givenName={profile?.givenName || user?.given_name} />;
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
