import { AppState, Auth0Provider } from '@auth0/auth0-react';
import { ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config, { auth0Config } from '../config';

/** Auth0 provider that returns the user to where they started logging in */
const AuthProvider = ({ children }: { children: ReactNode }) => {
    const navigate = useNavigate();
    const onRedirectCallback = useCallback(
        (appState?: AppState) =>
            navigate(appState?.returnTo ?? '/', { replace: true }),
        [navigate]
    );

    return (
        <Auth0Provider
            domain={auth0Config.domain}
            clientId={auth0Config.clientId}
            cacheLocation="localstorage"
            useRefreshTokens
            onRedirectCallback={onRedirectCallback}
            authorizationParams={{
                redirect_uri: config.frontEndUrl,
                audience: config.apiUrl,
                scope: 'openid profile email',
            }}
        >
            {children}
        </Auth0Provider>
    );
};

export default AuthProvider;
