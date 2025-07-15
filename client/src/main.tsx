import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Auth0Provider } from '@auth0/auth0-react';
import config from './config';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Auth0Provider
            domain="dev-1jevct6pshmx18pw.uk.auth0.com"
            clientId="I1Fh9UypRWcfGdtY7R5QWfJof6Z675Pt"
            authorizationParams={{
                redirect_uri: config.frontEndUrl,
                audience: config.apiUrl,
                scope: 'openid profile email',
            }}
        >
            <App />
        </Auth0Provider>
    </React.StrictMode>
);
