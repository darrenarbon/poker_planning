import { Socket } from 'socket.io-client';
import SetEstimate from '../SetEstimate';
import { TicketForVoting } from '../PokerSession/types';

type PokerSessionProps = {
    roomName: string;
    currentTicket: TicketForVoting;
    setEstimate: (estimate: number) => void;
    socket: Socket;
};

const TicketEstimateAdminPanel = ({
    roomName,
    currentTicket,
    setEstimate,
    socket,
}: PokerSessionProps) => {
    return (
        <div className="text-center mt-5">
            <button
                className="btn btn-primary btn-sm"
                onClick={() =>
                    socket.emit('showVotes', {
                        roomName,
                        ticketId: currentTicket?.ticket_id,
                    })
                }
            >
                Show Votes
            </button>
            <hr />
            <SetEstimate
                setEstimate={setEstimate}
                currentTicket={currentTicket}
            />
        </div>
    );
};

export default TicketEstimateAdminPanel;
