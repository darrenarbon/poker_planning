import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';

import { checkJwt } from './checkJwt.js';

type SocketMiddleware = (socket: Socket, next: (err?: Error) => void) => void;

/**
 * Socket.IO middleware that verifies the Auth0 access token sent in the
 * handshake (`auth: { token }`) and stores the caller's sub on `socket.data`.
 * Event handlers trust only `socket.data.userSub`, never a sub in a payload.
 */
export const createSocketAuth =
    (verify = checkJwt): SocketMiddleware =>
    (socket, next) => {
        const { handshake } = socket;
        const token = handshake.auth?.token;
        if (typeof token !== 'string' || !token) {
            return next(new Error('Unauthorized'));
        }
        // checkJwt expects an Express request: it reads the token from the
        // headers and rebuilds the URL from the protocol, Host header and path
        const headers = {
            ...handshake.headers,
            authorization: `Bearer ${token}`,
        };
        const req = {
            headers,
            get: (name: string) =>
                headers[name.toLowerCase() as keyof typeof headers],
            method: 'GET',
            protocol: handshake.secure ? 'https' : 'http',
            originalUrl: handshake.url,
            query: {},
            body: undefined,
            is: () => false,
        } as unknown as Request;

        verify(req, {} as Response, (error?: unknown) => {
            const sub = req.auth?.payload.sub;
            if (error || !sub) {
                if (error) console.warn('Socket auth failed:', String(error));
                return next(new Error('Unauthorized'));
            }
            socket.data.userSub = sub;
            next();
        });
    };

export const socketAuth = createSocketAuth();
