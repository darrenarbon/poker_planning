import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Auth0Provider } from '@auth0/auth0-react';
import config, { auth0Config } from './config';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Auth0Provider
            domain={auth0Config.domain}
            clientId={auth0Config.clientId}
            authorizationParams={{
                redirect_uri: config.frontEndUrl,
                audience: config.apiUrl,
                scope: 'openid profile email',
            }}
        >
            <App />
        </Auth0Provider>
    </React.StrictMode>,
);
