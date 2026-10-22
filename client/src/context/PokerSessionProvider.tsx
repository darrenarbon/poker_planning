import { useAuth0 } from '@auth0/auth0-react';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
    CONNECTION_LOST_MESSAGE,
    useApi,
    useJiraTicket,
    useRoomDetails,
    useRoomSocket,
} from '../hooks';
import { socket } from '../services/socket';
import { TicketForVoting } from '../types';
import {
    findNextTicket,
    moveTicket as moveTicketInList,
    replaceTicket,
    withVote,
} from '../utils';
import {
    PokerSessionContext,
    PokerSessionContextValue,
} from './PokerSessionContext';

const refinementModeKey = (roomName: string) => `refinementMode:${roomName}`;

const readRefinementMode = (roomName: string) => {
    try {
        return sessionStorage.getItem(refinementModeKey(roomName)) === 'true';
    } catch {
        return false;
    }
};

const saveRefinementMode = (roomName: string, enabled: boolean) => {
    try {
        sessionStorage.setItem(refinementModeKey(roomName), String(enabled));
    } catch {
        // storage unavailable, the mode just won't survive a refresh
    }
};

type PokerSessionProviderProps = {
    roomName: string;
    children: ReactNode;
};

export const PokerSessionProvider = ({
    roomName,
    children,
}: PokerSessionProviderProps) => {
    const { user, getAccessTokenSilently } = useAuth0();
    const api = useApi();
    const {
        room,
        setRoom,
        tickets,
        setTickets,
        archivedTickets,
        setArchivedTickets,
        users,
        setUsers,
        loadError,
    } = useRoomDetails(roomName);
    const [currentTicketId, setCurrentTicketId] = useState<string>();
    const [onlineSubs, setOnlineSubs] = useState<string[]>([]);
    const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const dismissError = useCallback(() => setError(null), []);
    const clearConnectionError = useCallback(
        () =>
            setError((current) =>
                current === CONNECTION_LOST_MESSAGE ? null : current
            ),
        []
    );

    const currentTicket = tickets.find((t) => t.ticket_id === currentTicketId);
    const showVotes = !!currentTicket?.votes_revealed;
    const [refinementModeEnabled, setRefinementModeEnabled] = useState(() =>
        readRefinementMode(roomName)
    );
    const jira = useJiraTicket(currentTicket?.ticket_number);

    useRoomSocket({
        roomName,
        userSub: user?.sub,
        getToken: getAccessTokenSilently,
        setRoom,
        setTickets,
        setArchivedTickets,
        setUsers,
        setOnlineSubs,
        setCurrentTicketId,
        setTimerEndsAt,
        onError: setError,
        onReconnect: clearConnectionError,
    });

    // display only: the server enforces admin rights on every admin action
    const isOwner = !!room && user?.sub === room.adminSub;
    const isAdmin =
        isOwner ||
        (!!user?.sub && !!room?.coFacilitatorSubs?.includes(user.sub));

    // only the facilitator can be in refinement mode
    const refinementMode = isAdmin && refinementModeEnabled;
    const hideOwnVote = refinementMode && !showVotes;

    const toggleRefinementMode = useCallback(() => {
        const enabled = !refinementModeEnabled;
        setRefinementModeEnabled(enabled);
        saveRefinementMode(roomName, enabled);
        // turning it on brings everyone to the ticket the facilitator is on
        if (enabled && isAdmin && currentTicketId) {
            socket.emit('selectTicket', {
                roomName,
                ticketId: currentTicketId,
            });
        }
    }, [refinementModeEnabled, isAdmin, currentTicketId, roomName]);

    const selectTicket = useCallback(
        (ticket: TicketForVoting) => {
            setCurrentTicketId(ticket.ticket_id);
            // everyone follows the facilitator only in refinement mode
            if (refinementMode) {
                socket.emit('selectTicket', {
                    roomName,
                    ticketId: ticket.ticket_id,
                });
            }
        },
        [refinementMode, roomName]
    );

    const nextTicket = useCallback(() => {
        const next = findNextTicket(tickets, currentTicketId);
        if (next) selectTicket(next);
    }, [tickets, currentTicketId, selectTicket]);

    const revote = useCallback(() => {
        if (!currentTicket) return;
        socket.emit('revote', { roomName, ticketId: currentTicket.ticket_id });
    }, [currentTicket, roomName]);

    const startTimer = useCallback(
        (seconds: number) => socket.emit('startTimer', { roomName, seconds }),
        [roomName]
    );

    const stopTimer = useCallback(
        () => socket.emit('stopTimer', { roomName }),
        [roomName]
    );

    const addCoFacilitator = useCallback(
        (userSub: string) =>
            socket.emit('addCoFacilitator', { roomName, userSub }),
        [roomName]
    );

    const removeCoFacilitator = useCallback(
        (userSub: string) =>
            socket.emit('removeCoFacilitator', { roomName, userSub }),
        [roomName]
    );

    const handOver = useCallback(
        (userSub: string) => socket.emit('handOver', { roomName, userSub }),
        [roomName]
    );

    const archiveSprint = useCallback(
        () => socket.emit('archiveSprint', { roomName }),
        [roomName]
    );

    const submitVote = useCallback(
        (vote: number) => {
            if (!currentTicket) return;
            socket.emit('vote', {
                roomName,
                ticketId: currentTicket.ticket_id,
                vote,
            });
            setTickets((prev) =>
                replaceTicket(prev, withVote(currentTicket, vote, user?.sub))
            );
        },
        [currentTicket, roomName, setTickets, user?.sub]
    );

    const revealVotes = useCallback(() => {
        if (!currentTicket) return;
        socket.emit('showVotes', {
            roomName,
            ticketId: currentTicket.ticket_id,
        });
    }, [currentTicket, roomName]);

    const setEstimate = useCallback(
        (estimate: number) => {
            if (!currentTicket) return;
            const updated = { ...currentTicket, chosen_estimate: estimate };
            setTickets((prev) => replaceTicket(prev, updated));
            socket.emit('setEstimate', { roomName, currentTicket: updated });
        },
        [currentTicket, roomName, setTickets]
    );

    const addTicket = useCallback(
        async (ticketNumber: string) => {
            if (!ticketNumber) return;
            try {
                const newTicket = await api.addTicket(roomName, ticketNumber);
                // the server adds it to the end of the list
                setTickets((prev) => [...prev, newTicket]);
            } catch (e) {
                console.error('Failed to add new ticket', e);
                setError(`Could not add ticket ${ticketNumber}.`);
            }
        },
        [api, roomName, setTickets]
    );

    const moveTicket = useCallback(
        (ticketId: string, toIndex: number) => {
            const moved = moveTicketInList(tickets, ticketId, toIndex);
            if (moved === tickets) return;
            setTickets(moved);
            socket.emit('reorderTickets', {
                roomName,
                ticketIds: moved.map((t) => t.ticket_id),
            });
        },
        [tickets, roomName, setTickets]
    );

    const deleteCurrentTicket = useCallback(async () => {
        if (!currentTicket) return;
        try {
            await api.deleteTicket(currentTicket.ticket_id);
            setTickets((prev) =>
                prev.filter((t) => t.ticket_id !== currentTicket.ticket_id)
            );
            setCurrentTicketId(undefined);
        } catch (e) {
            console.error('Failed to delete ticket', e);
            setError(`Could not delete ticket ${currentTicket.ticket_number}.`);
        }
    }, [api, currentTicket, setTickets]);

    const toggleFavourite = useCallback(async () => {
        if (!room) return;
        const favourite = !room.favourite;
        setRoom({ ...room, favourite });
        try {
            await api.setFavourite(roomName, favourite);
        } catch (e) {
            console.error('Failed to update favourite', e);
            setRoom({ ...room, favourite: !favourite });
            setError('Could not update your favourites.');
        }
    }, [api, room, roomName, setRoom]);

    const setRoomHidden = useCallback(
        async (hidden: boolean) => {
            if (!room) return;
            try {
                await api.setHidden(roomName, hidden);
                setRoom({ ...room, hidden });
            } catch (e) {
                console.error('Failed to update room visibility', e);
                setError(
                    hidden
                        ? 'Could not hide the room.'
                        : 'Could not unhide the room.'
                );
            }
        },
        [api, room, roomName, setRoom]
    );

    const value = useMemo<PokerSessionContextValue>(
        () => ({
            roomName,
            room,
            user,
            users,
            onlineSubs,
            tickets,
            archivedTickets,
            currentTicket,
            jira,
            showVotes,
            refinementMode,
            hideOwnVote,
            isAdmin,
            isOwner,
            timerEndsAt,
            loadError,
            error,
            dismissError,
            selectTicket,
            nextTicket,
            revote,
            startTimer,
            stopTimer,
            addCoFacilitator,
            removeCoFacilitator,
            handOver,
            archiveSprint,
            submitVote,
            revealVotes,
            toggleRefinementMode,
            toggleFavourite,
            setRoomHidden,
            setEstimate,
            addTicket,
            moveTicket,
            deleteCurrentTicket,
        }),
        [
            roomName,
            room,
            user,
            users,
            onlineSubs,
            tickets,
            archivedTickets,
            currentTicket,
            jira,
            showVotes,
            refinementMode,
            hideOwnVote,
            isAdmin,
            isOwner,
            timerEndsAt,
            loadError,
            error,
            dismissError,
            selectTicket,
            nextTicket,
            revote,
            startTimer,
            stopTimer,
            addCoFacilitator,
            removeCoFacilitator,
            handOver,
            archiveSprint,
            submitVote,
            revealVotes,
            toggleRefinementMode,
            toggleFavourite,
            setRoomHidden,
            setEstimate,
            addTicket,
            moveTicket,
            deleteCurrentTicket,
        ]
    );

    return (
        <PokerSessionContext.Provider value={value}>
            {children}
        </PokerSessionContext.Provider>
    );
};
