import { useEffect, useState } from 'react';
import { Room, TicketForVoting, UserModel } from '../types';
import { useApi } from './useApi';

/** Loads a room plus its tickets and users, exposing setters for live updates */
export const useRoomDetails = (roomName: string) => {
    const api = useApi();
    const [room, setRoom] = useState<Room>();
    const [tickets, setTickets] = useState<TicketForVoting[]>([]);
    const [users, setUsers] = useState<UserModel[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        setLoadError(null);
        api.getRoom(roomName)
            .then(({ room, tickets, users }) => {
                setRoom(room);
                setTickets(tickets);
                setUsers(users);
            })
            .catch((error) => {
                console.error('Failed to load room:', error);
                setLoadError(`Could not load room "${roomName}".`);
            });
    }, [api, roomName]);

    return {
        room,
        setRoom,
        tickets,
        setTickets,
        users,
        setUsers,
        loadError,
    };
};
