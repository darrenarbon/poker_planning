import { Dispatch, SetStateAction, useEffect } from 'react';
import { socket } from '../services/socket';
import { ServerToClientEvents, TicketForVoting, UserModel } from '../types';
import { replaceTicket, withVote, withVoteStats } from '../utils';

export const CONNECTION_LOST_MESSAGE =
    'Lost connection to the server. Retrying…';

type UseRoomSocketArgs = {
    roomName: string;
    userSub: string | undefined;
    getToken: () => Promise<string>;
    setTickets: Dispatch<SetStateAction<TicketForVoting[]>>;
    setUsers: Dispatch<SetStateAction<UserModel[]>>;
    setCurrentTicketId: Dispatch<SetStateAction<string | undefined>>;
    onError: (message: string) => void;
    onReconnect: () => void;
};

/**
 * Connects the socket while a logged-in user is in the room, (re-)joining the
 * room on every connect, and applies server events to local state. The server
 * identifies the user from the access token sent with each handshake.
 */
export const useRoomSocket = ({
    roomName,
    userSub,
    getToken,
    setTickets,
    setUsers,
    setCurrentTicketId,
    onError,
    onReconnect,
}: UseRoomSocketArgs) => {
    useEffect(() => {
        if (!userSub) return;

        // called on every (re)connect, so an expired token is refreshed
        socket.auth = (cb) => {
            getToken().then(
                (token) => cb({ token }),
                () => cb({})
            );
        };
        const join = () => socket.emit('join', { roomName });

        socket.on('connect', join);
        if (socket.connected) {
            join();
        } else {
            socket.connect();
        }

        return () => {
            socket.off('connect', join);
            socket.disconnect();
        };
    }, [roomName, userSub, getToken]);

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
                    t.ticket_id === ticketId ? withVote(t, vote, userSub) : t
                )
            );

        // reveal on every client, whichever ticket they are currently viewing
        const onShowVotes: ServerToClientEvents['showVotes'] = ({ ticketId }) =>
            setTickets((prev) =>
                prev.map((t) =>
                    t.ticket_id === ticketId
                        ? { ...withVoteStats(t), votes_revealed: true }
                        : t
                )
            );

        // everyone in the room jumps to the ticket that was just estimated
        const onShowEstimate: ServerToClientEvents['showEstimate'] = ({
            currentTicket,
        }) => {
            setTickets((prev) => replaceTicket(prev, currentTicket));
            setCurrentTicketId(currentTicket.ticket_id);
        };

        const onConnectError = () => onError(CONNECTION_LOST_MESSAGE);

        socket.on('userJoined', onUserJoined);
        socket.on('voteReceived', onVoteReceived);
        socket.on('showVotes', onShowVotes);
        socket.on('showEstimate', onShowEstimate);
        socket.on('error', onError);
        socket.on('connect_error', onConnectError);
        socket.on('connect', onReconnect);
        return () => {
            socket.off('userJoined', onUserJoined);
            socket.off('voteReceived', onVoteReceived);
            socket.off('showVotes', onShowVotes);
            socket.off('showEstimate', onShowEstimate);
            socket.off('error', onError);
            socket.off('connect_error', onConnectError);
            socket.off('connect', onReconnect);
        };
    }, [setTickets, setUsers, setCurrentTicketId, onError, onReconnect]);
};
