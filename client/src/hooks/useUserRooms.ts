import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { RoomSummary } from '../types';
import { useApi } from './useApi';

/** Registers the logged-in user with the API, then loads the rooms they own */
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
                setRooms(await api.getUserRooms(user?.sub));
            } catch (error) {
                console.error('Error logging in user:', error);
                setError(
                    'Could not load your rooms. Please refresh to try again.',
                );
            } finally {
                setLoaded(true);
            }
        };
        load();
    }, [api, isAuthenticated, user]);

    return { rooms, loaded, error };
};
