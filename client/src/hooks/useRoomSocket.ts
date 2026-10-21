import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { ServerToClientEvents, TicketForVoting, UserModel } from '../types';
import { replaceTicket, withVote, withVoteStats } from '../utils';

type UseRoomSocketArgs = {
    roomName: string;
    userSub: string | undefined;
    currentTicketId: string | undefined;
    setTickets: Dispatch<SetStateAction<TicketForVoting[]>>;
    setUsers: Dispatch<SetStateAction<UserModel[]>>;
    setCurrentTicketId: Dispatch<SetStateAction<string | undefined>>;
    setShowVotes: Dispatch<SetStateAction<boolean>>;
};

/** Joins the room's socket channel and applies server events to local state */
export const useRoomSocket = ({
    roomName,
    userSub,
    currentTicketId,
    setTickets,
    setUsers,
    setCurrentTicketId,
    setShowVotes,
}: UseRoomSocketArgs) => {
    // a ref lets the listeners read the latest value without re-subscribing
    const currentTicketIdRef = useRef(currentTicketId);
    currentTicketIdRef.current = currentTicketId;

    useEffect(() => {
        if (userSub) {
            socket.emit('join', { roomName, userSub });
        }
    }, [roomName, userSub]);

    useEffect(() => {
        const onUserJoined: ServerToClientEvents['userJoined'] = ({ users }) =>
            setUsers(users);

        const onVoteReceived: ServerToClientEvents['voteReceived'] = ({
            ticketId,
            vote,
            userSub,
        }) =>
            setTickets((prev) =>
                prev.map((t) =>
                    t.ticket_id === ticketId ? withVote(t, vote, userSub) : t,
                ),
            );

        const onShowVotes: ServerToClientEvents['showVotes'] = ({
            ticketId,
        }) => {
            if (ticketId !== currentTicketIdRef.current) return;
            setTickets((prev) =>
                prev.map((t) =>
                    t.ticket_id === ticketId ? withVoteStats(t) : t,
                ),
            );
            setShowVotes(true);
        };

        // everyone in the room jumps to the ticket that was just estimated
        const onShowEstimate: ServerToClientEvents['showEstimate'] = ({
            currentTicket,
        }) => {
            setTickets((prev) => replaceTicket(prev, currentTicket));
            setCurrentTicketId(currentTicket.ticket_id);
        };

        socket.on('userJoined', onUserJoined);
        socket.on('voteReceived', onVoteReceived);
        socket.on('showVotes', onShowVotes);
        socket.on('showEstimate', onShowEstimate);
        return () => {
            socket.off('userJoined', onUserJoined);
            socket.off('voteReceived', onVoteReceived);
            socket.off('showVotes', onShowVotes);
            socket.off('showEstimate', onShowEstimate);
        };
    }, [setTickets, setUsers, setCurrentTicketId, setShowVotes]);
};
