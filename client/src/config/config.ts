type AppConfig = {
    apiUrl: string;
    frontEndUrl?: string;
};

enum Environment {
    Local = 'local',
    Production = 'production',
}

const getEnvironment = (hostUrl: string): Environment => {
    if (hostUrl === 'https://poker-planning-client.vercel.app/') {
        return Environment.Production;
    }

    return Environment.Local;
};

const getConfig = (): AppConfig => {
    const hostUrl = document.location.origin + '/';
    const environment = getEnvironment(hostUrl);

    switch (environment) {
        case Environment.Local:
            return {
                apiUrl: 'http://localhost:3000',
                frontEndUrl: 'http://localhost:5173',
            };

        case Environment.Production:
            return {
                apiUrl: 'https://poker-planning-front-end.onrender.com',
                frontEndUrl: 'https://poker-planning-client.vercel.app',
            };
    }
};

const config = getConfig();

export default config;
