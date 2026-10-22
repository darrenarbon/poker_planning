type AppConfig = {
    apiUrl: string;
    frontEndUrl: string;
};

enum Environment {
    Local = 'local',
    Production = 'production',
}

const PRODUCTION_HOST = 'https://poker-planning-client.vercel.app/';

const getEnvironment = (hostUrl: string): Environment =>
    hostUrl === PRODUCTION_HOST ? Environment.Production : Environment.Local;

const configs: Record<Environment, AppConfig> = {
    [Environment.Local]: {
        apiUrl: 'http://localhost:3000',
        frontEndUrl: 'http://localhost:5173',
    },
    [Environment.Production]: {
        apiUrl: 'https://poker-planning-front-end.onrender.com',
        frontEndUrl: 'https://poker-planning-client.vercel.app',
    },
};

const config: AppConfig =
    configs[getEnvironment(document.location.origin + '/')];

export const auth0Config = {
    domain: 'dev-1jevct6pshmx18pw.uk.auth0.com',
    clientId: 'I1Fh9UypRWcfGdtY7R5QWfJof6Z675Pt',
};

export default config;
