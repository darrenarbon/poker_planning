import { useAuth0 } from '@auth0/auth0-react';
import Loading from '../../components/Loading';
import NavBar from '../../components/NavBar';
import { useUserRooms } from '../../hooks';
import CreateRoomForm from './components/CreateRoomForm';
import JoinExistingRoom from './components/JoinExistingRoom';
import MyRoomsList from './components/MyRoomsList';

const JoinRoomPage = () => {
    const { user, isAuthenticated } = useAuth0();
    const { rooms, loaded } = useUserRooms();

    const renderContent = () => {
        if (!isAuthenticated) {
            return <h2>Please log in to create or join a room</h2>;
        }
        if (!loaded || !user) {
            return <Loading />;
        }
        return (
            <div className="row">
                <div className="col-6 text-center p-4">
                    <JoinExistingRoom />
                </div>
                <div className="col-6 border-start border-dark p-4">
                    <CreateRoomForm />
                    <hr />
                    <MyRoomsList rooms={rooms} />
                </div>
            </div>
        );
    };

    return (
        <div className="container mt-4">
            <NavBar />
            {renderContent()}
        </div>
    );
};

export default JoinRoomPage;
