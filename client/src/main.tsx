import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import { Auth0Provider } from '@auth0/auth0-react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-1jevct6pshmx18pw.uk.auth0.com"
      clientId="I1Fh9UypRWcfGdtY7R5QWfJof6Z675Pt"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: 'http://localhost:3000',
        scope: 'openid profile email',
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
