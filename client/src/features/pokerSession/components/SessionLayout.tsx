import ErrorAlert from '../../../components/ErrorAlert';
import Loading from '../../../components/Loading';
import { usePokerSession } from '../../../context';
import CurrentTicketPanel from './CurrentTicketPanel';
import RoomHeader from './RoomHeader';
import SessionControls from './SessionControls';
import TicketList from './TicketList';

const SessionLayout = () => {
    const { user, room, loadError, error, dismissError, toggleFavourite } =
        usePokerSession();

    if (loadError) {
        return (
            <div className="container">
                <ErrorAlert message={loadError} />
            </div>
        );
    }

    if (!user || !room) {
        return <Loading />;
    }

    return (
        <div className="container-fluid session-layout px-0">
            <div className="row g-0">
                <aside className="col-md-4 col-lg-3 col-xl-2 session-sidebar p-3">
                    <TicketList />
                </aside>
                <div className="col-md-8 col-lg-9 col-xl-10 session-main px-4 py-2">
                    <ErrorAlert message={error} onDismiss={dismissError} />
                    <RoomHeader
                        room={room}
                        onToggleFavourite={toggleFavourite}
                    />
                    <SessionControls />
                    <CurrentTicketPanel />
                </div>
            </div>
        </div>
    );
};

export default SessionLayout;
