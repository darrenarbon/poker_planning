import express, { json } from 'express';
import cors from 'cors';

import { corsHeaders } from './middleware/cors.js';
import router from './routes/index.js';

export const createApp = () => {
    const app = express();

    app.use(
        cors({
            origin: '*',
            credentials: true,
            methods: '*',
            allowedHeaders: ['Content-Type', 'Authorization'],
        })
    );
    app.use(json());
    app.use(corsHeaders);
    app.use('/', router);

    return app;
};
