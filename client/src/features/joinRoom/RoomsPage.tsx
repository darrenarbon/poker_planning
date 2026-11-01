import { useAuth0 } from '@auth0/auth0-react';
import ErrorAlert from '../../components/ErrorAlert';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useUserRooms } from '../../hooks';
import { paths } from '../../routes';
import LoggedOutWelcome from './components/LoggedOutWelcome';
import RoomLists from './components/RoomLists';

const RoomsPage = () => {
    const { user, isAuthenticated, isLoading } = useAuth0();
    const { rooms, loaded, error, toggleFavourite } = useUserRooms();

    const renderContent = () => {
        if (isLoading) {
            return <Loading />;
        }
        if (!isAuthenticated) {
            return <LoggedOutWelcome />;
        }
        if (!loaded || !user) {
            return <Loading />;
        }
        return (
            <div className="dashboard">
                <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-2">
                    <div>
                        <h1 className="h3 fw-bold mb-1">
                            Welcome back
                            {user.given_name ? `, ${user.given_name}` : ''}
                        </h1>
                        <p className="text-secondary mb-0">
                            Pick up where you left off.
                        </p>
                    </div>
                    <a className="btn btn-primary" href={paths.newRoom}>
                        New room
                    </a>
                </header>
                <RoomLists rooms={rooms} onToggleFavourite={toggleFavourite} />
            </div>
        );
    };

    return (
        <>
            <NavBar />
            <div className="container mt-4 pb-5">
                <ErrorAlert message={error} />
                {renderContent()}
            </div>
        </>
    );
};

export default RoomsPage;
