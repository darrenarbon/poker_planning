type AppConfig = {
    apiUrl: string;
    frontEndUrl: string;
};

const readEnv = (name: keyof ImportMetaEnv): string => {
    const value = import.meta.env[name];
    if (!value) {
        console.error(`Missing environment variable ${name}`);
    }
    return value ?? '';
};

// set in client/.env.development locally and in the Vercel project settings
const config: AppConfig = {
    apiUrl: readEnv('VITE_API_URL'),
    frontEndUrl: import.meta.env.VITE_FRONTEND_URL || document.location.origin,
};

export const auth0Config = {
    domain: readEnv('VITE_AUTH0_DOMAIN'),
    clientId: readEnv('VITE_AUTH0_CLIENT_ID'),
};

export default config;
