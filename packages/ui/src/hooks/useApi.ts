import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo } from 'react';
import { Api, createApi } from '../services/api';

/** Gets the current Auth0 access token, or '' when there isn't one */
export const useGetToken = (): (() => Promise<string>) => {
    const { getAccessTokenSilently } = useAuth0();
    return useCallback(
        async () => (await getAccessTokenSilently()) ?? '',
        [getAccessTokenSilently]
    );
};

/** API client that authenticates each request with the current Auth0 token */
export const useApi = (): Api => {
    const getToken = useGetToken();
    return useMemo(() => createApi(getToken), [getToken]);
};
