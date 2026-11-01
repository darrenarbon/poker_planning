import { useAuth0 } from '@auth0/auth0-react';
import ErrorAlert from '../../../../components/ErrorAlert';
import Loading from '../../../../components/Loading';
import NavBar from '../../../../components/NavBar';
import { paths } from '../../../../routes';
import { useUserRooms } from '../../hooks';
import { pokerPaths } from '../../routes';
import LoggedOutWelcome from './components/LoggedOutWelcome';
import RoomLists from './components/RoomLists';

/** Planning poker's home: the rooms the user created or joined */
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
                <a className="small" href={paths.home}>
                    &larr; All apps
                </a>
                <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-2 mb-2">
                    <div>
                        <h1 className="h3 fw-bold mb-1">Planning poker</h1>
                        <p className="text-secondary mb-0">
                            Pick up where you left off.
                        </p>
                    </div>
                    <div className="d-flex gap-2">
                        <a
                            className="btn btn-outline-primary"
                            href={pokerPaths.joinRoom}
                        >
                            Join room
                        </a>
                        <a
                            className="btn btn-primary"
                            href={pokerPaths.newRoom}
                        >
                            New room
                        </a>
                    </div>
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
