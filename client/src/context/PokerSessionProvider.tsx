import { useAuth0 } from '@auth0/auth0-react';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, useJiraTicket, useRoomDetails, useRoomSocket } from '../hooks';
import { socket } from '../services/socket';
import { TicketForVoting } from '../types';
import { replaceTicket, withVote } from '../utils';
import {
    PokerSessionContext,
    PokerSessionContextValue,
} from './PokerSessionContext';

type PokerSessionProviderProps = {
    roomName: string;
    children: ReactNode;
};

export const PokerSessionProvider = ({
    roomName,
    children,
}: PokerSessionProviderProps) => {
    const { user } = useAuth0();
    const api = useApi();
    const [searchParams] = useSearchParams();
    const { room, tickets, setTickets, users, setUsers } =
        useRoomDetails(roomName);
    const [currentTicketId, setCurrentTicketId] = useState<string>();
    const [showVotes, setShowVotes] = useState(false);

    const currentTicket = tickets.find((t) => t.ticket_id === currentTicketId);
    const jiraTicket = useJiraTicket(currentTicket?.ticket_number);

    useRoomSocket({
        roomName,
        userSub: user?.sub,
        currentTicketId,
        setTickets,
        setUsers,
        setCurrentTicketId,
        setShowVotes,
    });

    const isAdmin =
        (!!room && user?.sub === room.adminSub) ||
        searchParams.get('admin') === 'true';

    const selectTicket = useCallback((ticket: TicketForVoting) => {
        setCurrentTicketId(ticket.ticket_id);
        setShowVotes(false);
    }, []);

    const submitVote = useCallback(
        (vote: number) => {
            if (!currentTicket) return;
            socket.emit('vote', {
                roomName,
                ticketId: currentTicket.ticket_id,
                vote,
                userSub: user?.sub,
            });
            setTickets((prev) =>
                replaceTicket(prev, withVote(currentTicket, vote, user?.sub)),
            );
        },
        [currentTicket, roomName, setTickets, user?.sub],
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
        [currentTicket, roomName, setTickets],
    );

    const addTicket = useCallback(
        async (ticketNumber: string) => {
            if (!ticketNumber) return;
            try {
                const newTicket = await api.addTicket(roomName, ticketNumber);
                setTickets((prev) => [newTicket, ...prev]);
            } catch {
                console.error('Failed to add new ticket');
            }
        },
        [api, roomName, setTickets],
    );

    const deleteCurrentTicket = useCallback(async () => {
        if (!currentTicket) return;
        const confirmed = confirm(
            `Are you sure you want to delete ticket ${currentTicket.ticket_number}? This action cannot be undone.`,
        );
        if (!confirmed) return;
        try {
            await api.deleteTicket(currentTicket.ticket_id);
            setTickets((prev) =>
                prev.filter((t) => t.ticket_id !== currentTicket.ticket_id),
            );
            setCurrentTicketId(undefined);
        } catch {
            console.error('Failed to delete ticket');
        }
    }, [api, currentTicket, setTickets]);

    const value = useMemo<PokerSessionContextValue>(
        () => ({
            roomName,
            room,
            user,
            users,
            tickets,
            currentTicket,
            jiraTicket,
            showVotes,
            isAdmin,
            selectTicket,
            submitVote,
            revealVotes,
            setEstimate,
            addTicket,
            deleteCurrentTicket,
        }),
        [
            roomName,
            room,
            user,
            users,
            tickets,
            currentTicket,
            jiraTicket,
            showVotes,
            isAdmin,
            selectTicket,
            submitVote,
            revealVotes,
            setEstimate,
            addTicket,
            deleteCurrentTicket,
        ],
    );

    return (
        <PokerSessionContext.Provider value={value}>
            {children}
        </PokerSessionContext.Provider>
    );
};
