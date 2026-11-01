import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useEffect, useState } from 'react';
import { Holiday, HolidayInput } from '../types';
import { useApi } from './useApi';

/**
 * Loads the logged-in user's holidays and adds, changes and removes them.
 * Pass a userId to act on someone else's, which the API only allows for
 * super admins and the owners and admins of their teams.
 */
export const useHolidays = (userId?: number) => {
    const { isAuthenticated } = useAuth0();
    const api = useApi();
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setHolidays(await api.getHolidays(userId));
            setError(null);
        } catch (error) {
            console.error('Failed to load holidays:', error);
            setError('Could not load holidays. Please refresh to try again.');
        } finally {
            setLoaded(true);
        }
    }, [api, userId]);

    useEffect(() => {
        if (isAuthenticated) load();
    }, [isAuthenticated, load]);

    /** Runs a change, then reloads; resolves to whether it worked */
    const change = useCallback(
        async (action: () => Promise<unknown>, failure: string) => {
            setError(null);
            try {
                await action();
                await load();
                return true;
            } catch (error) {
                console.error(failure, error);
                setError(failure);
                return false;
            }
        },
        [load]
    );

    const add = useCallback(
        (input: HolidayInput) =>
            change(
                () => api.addHoliday(input, userId),
                'Could not save the holiday. Please try again.'
            ),
        [api, change, userId]
    );

    const update = useCallback(
        (holidayId: number, input: HolidayInput) =>
            change(
                () => api.updateHoliday(holidayId, input, userId),
                'Could not save the holiday. Please try again.'
            ),
        [api, change, userId]
    );

    const remove = useCallback(
        (holidayId: number) =>
            change(
                () => api.deleteHoliday(holidayId, userId),
                'Could not delete the holiday. Please try again.'
            ),
        [api, change, userId]
    );

    const importBankHolidays = useCallback(
        async (
            region: Parameters<typeof api.importBankHolidays>[0],
            subdivision?: string
        ) => {
            let added = 0;
            const ok = await change(async () => {
                added = (
                    await api.importBankHolidays(region, subdivision, userId)
                ).added;
            }, 'Could not fetch bank holidays right now. Please try again later.');
            return ok ? added : null;
        },
        [api, change, userId]
    );

    return {
        holidays,
        loaded,
        error,
        add,
        update,
        remove,
        importBankHolidays,
    };
};
