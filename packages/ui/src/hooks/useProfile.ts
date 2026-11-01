import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { useApi } from './useApi';

/**
 * Loads the logged-in user's name and saves changes to it. The name lives on
 * our own user record, so it can differ from the one Auth0 holds; use this
 * rather than the Auth0 user wherever the name is shown.
 */
export const useProfile = () => {
    const { user, isAuthenticated } = useAuth0();
    const api = useApi();
    const [profile, setProfile] = useState<UserProfile>();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const load = async () => {
            try {
                // the record is created on first login, so make sure it exists
                await api.login(user);
                setProfile(await api.getProfile());
            } catch (error) {
                console.error('Failed to load profile:', error);
                setError('Could not load your name.');
            }
        };
        load();
    }, [api, isAuthenticated, user]);

    const save = useCallback(
        async (next: UserProfile) => {
            setError(null);
            try {
                setProfile(await api.saveProfile(next));
                return true;
            } catch (error) {
                console.error('Failed to save profile:', error);
                setError('Could not save your name. Please try again.');
                return false;
            }
        },
        [api]
    );

    return { profile, error, save };
};
