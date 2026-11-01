import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import { UserTeam } from '../types';
import { useApi } from './useApi';

/** Registers the logged-in user with the API, then loads the teams they belong to */
export const useMyTeams = () => {
    const { user, isAuthenticated } = useAuth0();
    const api = useApi();
    const [teams, setTeams] = useState<UserTeam[]>([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            // teams belong to users, so make sure the user exists first
            await api.login(user);
            const mine = await api.getMyTeams();
            setTeams(mine.teams);
            setIsSuperAdmin(mine.isSuperAdmin);
            setError(null);
        } catch (error) {
            console.error('Failed to load teams:', error);
            setError('Could not load your teams. Please refresh to try again.');
        } finally {
            setLoaded(true);
        }
    }, [api, user]);

    useEffect(() => {
        if (isAuthenticated) load();
    }, [isAuthenticated, load]);

    return { teams, isSuperAdmin, loaded, error, reload: load };
};
