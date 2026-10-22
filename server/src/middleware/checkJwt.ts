import { auth } from 'express-oauth2-jwt-bearer';

import { env } from '../config/env.js';

export const checkJwt = auth({
    audience: env.auth0Audience,
    issuerBaseURL: env.auth0IssuerBaseUrl,
});
