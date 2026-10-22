import NavBar from '../../components/NavBar';
import { paths } from '../../routes';
import CreateRoomForm from './components/CreateRoomForm';

/** Create a room */
const NewRoomPage = () => (
    <>
        <NavBar />
        <div className="container mt-4 pb-5">
            <div className="dashboard">
                <a className="small" href={paths.home}>
                    &larr; Back to rooms
                </a>
                <header className="mt-2 mb-4">
                    <h1 className="h3 fw-bold mb-1">New room</h1>
                    <p className="text-secondary mb-0">
                        Set up a room, add tickets, then share it with your
                        team.
                    </p>
                </header>
                <div className="col-lg-8">
                    <CreateRoomForm />
                </div>
            </div>
        </div>
    </>
);

export default NewRoomPage;
