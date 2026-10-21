import Loading from '../../../components/Loading';
import { usePokerSession } from '../../../context';
import CurrentTicketPanel from './CurrentTicketPanel';
import RoomHeader from './RoomHeader';
import TicketList from './TicketList';

const scrollColumnStyle = { overflowY: 'auto', height: '90vh' } as const;

const SessionLayout = () => {
    const { user, room } = usePokerSession();

    if (!user || !room) {
        return <Loading />;
    }

    return (
        <div className="container-fluid">
            <div className="row" style={{ height: '90vh' }}>
                <div className="col-2 border-end" style={scrollColumnStyle}>
                    <TicketList />
                </div>
                <div className="col-10" style={scrollColumnStyle}>
                    <RoomHeader room={room} />
                    <CurrentTicketPanel />
                </div>
            </div>
        </div>
    );
};

export default SessionLayout;
