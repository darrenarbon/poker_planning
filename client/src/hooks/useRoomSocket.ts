import { Dispatch, SetStateAction, useEffect } from 'react';
import { socket } from '../services/socket';
import {
    Room,
    ServerToClientEvents,
    TicketForVoting,
    UserModel,
} from '../types';
import {
    replaceTicket,
    withVote,
    withVotesCleared,
    withVoteStats,
} from '../utils';

export const CONNECTION_LOST_MESSAGE =
    'Lost connection to the server. Retrying…';

type UseRoomSocketArgs = {
    roomName: string;
    userSub: string | undefined;
    getToken: () => Promise<string>;
    setRoom: Dispatch<SetStateAction<Room | undefined>>;
    setTickets: Dispatch<SetStateAction<TicketForVoting[]>>;
    setArchivedTickets: Dispatch<SetStateAction<TicketForVoting[]>>;
    setUsers: Dispatch<SetStateAction<UserModel[]>>;
    setOnlineSubs: Dispatch<SetStateAction<string[]>>;
    setCurrentTicketId: Dispatch<SetStateAction<string | undefined>>;
    setTimerEndsAt: Dispatch<SetStateAction<number | null>>;
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
    setRoom,
    setTickets,
    setArchivedTickets,
    setUsers,
    setOnlineSubs,
    setCurrentTicketId,
    setTimerEndsAt,
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

        const onPresence: ServerToClientEvents['presence'] = ({ online }) =>
            setOnlineSubs(online);

        // a newcomer lands on the facilitator's ticket and sees their timer
        const onRoomState: ServerToClientEvents['roomState'] = ({
            currentTicketId,
            timerEndsAt,
        }) => {
            if (currentTicketId !== null) setCurrentTicketId(currentTicketId);
            setTimerEndsAt(timerEndsAt);
        };

        // follow the facilitator; anyone can still click away afterwards
        const onTicketSelected: ServerToClientEvents['ticketSelected'] = ({
            ticketId,
        }) => setCurrentTicketId(ticketId ?? undefined);

        const onVotesCleared: ServerToClientEvents['votesCleared'] = ({
            ticketId,
        }) =>
            setTickets((prev) =>
                prev.map((t) =>
                    t.ticket_id === ticketId ? withVotesCleared(t) : t
                )
            );

        const onTimer: ServerToClientEvents['timer'] = ({ endsAt }) =>
            setTimerEndsAt(endsAt);

        const onFacilitators: ServerToClientEvents['facilitators'] = ({
            adminSub,
            coFacilitatorSubs,
        }) =>
            setRoom((room) =>
                room ? { ...room, adminSub, coFacilitatorSubs } : room
            );

        const onSprintArchived: ServerToClientEvents['sprintArchived'] = ({
            archivedAt,
        }) => {
            setTickets((prev) => {
                const archived = prev.map((t) => ({
                    ...t,
                    archived_at: archivedAt,
                }));
                // filtered, as React may call this updater twice
                setArchivedTickets((old) => [
                    ...archived,
                    ...old.filter(
                        (o) =>
                            !archived.some((a) => a.ticket_id === o.ticket_id)
                    ),
                ]);
                return [];
            });
            setCurrentTicketId(undefined);
            setTimerEndsAt(null);
        };

        const onConnectError = () => onError(CONNECTION_LOST_MESSAGE);

        socket.on('userJoined', onUserJoined);
        socket.on('voteReceived', onVoteReceived);
        socket.on('showVotes', onShowVotes);
        socket.on('showEstimate', onShowEstimate);
        socket.on('presence', onPresence);
        socket.on('roomState', onRoomState);
        socket.on('ticketSelected', onTicketSelected);
        socket.on('votesCleared', onVotesCleared);
        socket.on('timer', onTimer);
        socket.on('facilitators', onFacilitators);
        socket.on('sprintArchived', onSprintArchived);
        socket.on('error', onError);
        socket.on('connect_error', onConnectError);
        socket.on('connect', onReconnect);
        return () => {
            socket.off('userJoined', onUserJoined);
            socket.off('voteReceived', onVoteReceived);
            socket.off('showVotes', onShowVotes);
            socket.off('showEstimate', onShowEstimate);
            socket.off('presence', onPresence);
            socket.off('roomState', onRoomState);
            socket.off('ticketSelected', onTicketSelected);
            socket.off('votesCleared', onVotesCleared);
            socket.off('timer', onTimer);
            socket.off('facilitators', onFacilitators);
            socket.off('sprintArchived', onSprintArchived);
            socket.off('error', onError);
            socket.off('connect_error', onConnectError);
            socket.off('connect', onReconnect);
        };
    }, [
        setRoom,
        setTickets,
        setArchivedTickets,
        setUsers,
        setOnlineSubs,
        setCurrentTicketId,
        setTimerEndsAt,
        onError,
        onReconnect,
    ]);
};
