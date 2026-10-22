import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';
import { Api, createApi } from '../services/api';

/** API client that authenticates each request with the current Auth0 token */
export const useApi = (): Api => {
    const { getAccessTokenSilently } = useAuth0();
    return useMemo(
        () => createApi(() => getAccessTokenSilently()),
        [getAccessTokenSilently]
    );
};
