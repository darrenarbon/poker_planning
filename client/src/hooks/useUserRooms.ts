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

    useEffect(() => {
        if (!isAuthenticated) return;

        const load = async () => {
            try {
                await api.login(user);
                setRooms(await api.getUserRooms(user?.sub));
                setLoaded(true);
            } catch (error) {
                console.error('Error logging in user:', error);
            }
        };
        load();
    }, [api, isAuthenticated, user]);

    return { rooms, loaded };
};
