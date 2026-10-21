import { useParams } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import { PokerSessionProvider } from '../../context';
import { RoomRouteParams } from '../../routes';
import SessionLayout from './components/SessionLayout';

const PokerSessionPage = () => {
    const { roomName } = useParams<RoomRouteParams>() as RoomRouteParams;

    return (
        <main>
            <NavBar />
            <PokerSessionProvider roomName={roomName}>
                <SessionLayout />
            </PokerSessionProvider>
        </main>
    );
};

export default PokerSessionPage;
