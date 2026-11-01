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
        const token = socket.handshake.auth?.token;
        if (typeof token !== 'string' || !token) {
            return next(new Error('Unauthorized'));
        }
        // checkJwt only reads the token from these fields
        const req = {
            headers: { authorization: `Bearer ${token}` },
            query: {},
            body: undefined,
            is: () => false,
        } as unknown as Request;

        verify(req, {} as Response, (error?: unknown) => {
            const sub = req.auth?.payload.sub;
            if (error || !sub) {
                return next(new Error('Unauthorized'));
            }
            socket.data.userSub = sub;
            next();
        });
    };

export const socketAuth = createSocketAuth();
