import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import { RoomSummary } from '../types';
import { useApi } from './useApi';

/** Registers the logged-in user with the API, then loads the rooms they created or joined */
export const useUserRooms = () => {
    const { user, isAuthenticated } = useAuth0();
    const api = useApi();
    const [rooms, setRooms] = useState<RoomSummary[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const load = async () => {
            try {
                await api.login(user);
                setRooms(await api.getUserRooms());
            } catch (error) {
                console.error('Error logging in user:', error);
                setError(
                    'Could not load your rooms. Please refresh to try again.'
                );
            } finally {
                setLoaded(true);
            }
        };
        load();
    }, [api, isAuthenticated, user]);

    const toggleFavourite = useCallback(
        async (room: RoomSummary) => {
            const favourite = !room.favourite;
            const setFlag = (value: boolean) =>
                setRooms((prev) =>
                    prev.map((r) =>
                        r.room_id === room.room_id
                            ? { ...r, favourite: value }
                            : r
                    )
                );
            setFlag(favourite);
            try {
                await api.setFavourite(room.room_name, favourite);
            } catch (error) {
                console.error('Failed to update favourite:', error);
                setFlag(!favourite);
                setError('Could not update your favourites. Please try again.');
            }
        },
        [api]
    );

    return { rooms, loaded, error, toggleFavourite };
};
