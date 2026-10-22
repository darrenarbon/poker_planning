import NavBar from '../../components/NavBar';
import { paths } from '../../routes';
import JoinExistingRoom from './components/JoinExistingRoom';

/** Join a room by the ID a teammate shared */
const JoinRoomPage = () => (
    <>
        <NavBar />
        <div className="container mt-4 pb-5">
            <div className="dashboard">
                <a className="small" href={paths.home}>
                    &larr; Back to rooms
                </a>
                <header className="mt-2 mb-4">
                    <h1 className="h3 fw-bold mb-1">Join a room</h1>
                    <p className="text-secondary mb-0">
                        Got an invite link? Just open it. Otherwise, enter the
                        room ID.
                    </p>
                </header>
                <div className="col-md-8 col-lg-5">
                    <JoinExistingRoom />
                </div>
            </div>
        </div>
    </>
);

export default JoinRoomPage;
