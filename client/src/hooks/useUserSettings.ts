import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import { UserSettings } from '../types';
import { useApi } from './useApi';
import { applyDefaultTheme, setAppTheme } from './useTheme';

/** Loads the logged-in user's defaults and saves changes to them */
export const useUserSettings = () => {
    const { user, isAuthenticated } = useAuth0();
    const api = useApi();
    const [settings, setSettings] = useState<UserSettings>({});
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const load = async () => {
            try {
                // settings live on the user, so make sure they exist first
                await api.login(user);
                const saved = await api.getSettings();
                setSettings(saved);
                applyDefaultTheme(saved.theme);
            } catch (error) {
                console.error('Failed to load settings:', error);
                setError('Could not load your settings.');
            } finally {
                setLoaded(true);
            }
        };
        load();
    }, [api, isAuthenticated, user]);

    const save = useCallback(
        async (next: UserSettings) => {
            setError(null);
            try {
                const saved = await api.saveSettings(next);
                setSettings(saved);
                if (saved.theme) {
                    applyDefaultTheme(saved.theme);
                    setAppTheme(saved.theme);
                }
                return true;
            } catch (error) {
                console.error('Failed to save settings:', error);
                setError('Could not save your settings. Please try again.');
                return false;
            }
        },
        [api]
    );

    return { settings, loaded, error, save };
};
