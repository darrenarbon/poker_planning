import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

/** Logs in and brings the user back to the page they were on (e.g. a shared room link) */
export const useLogin = () => {
    const { loginWithRedirect } = useAuth0();
    return useCallback(
        () =>
            loginWithRedirect({
                appState: {
                    returnTo: window.location.pathname + window.location.search,
                },
            }),
        [loginWithRedirect]
    );
};
