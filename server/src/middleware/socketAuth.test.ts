import type { NextFunction, Request, Response } from 'express';
import type { Socket } from 'socket.io';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./checkJwt.js', () => ({ checkJwt: vi.fn() }));

import { fakeCheckJwt, TEST_SUB } from '../test/mockCheckJwt.js';
import { createSocketAuth } from './socketAuth.js';

const makeSocket = (auth: Record<string, unknown>) =>
    ({ handshake: { auth }, data: {} }) as unknown as Socket;

const run = (socket: Socket, verify = fakeCheckJwt) =>
    new Promise<Error | undefined>((resolve) =>
        createSocketAuth(verify as never)(socket, resolve)
    );

describe('socketAuth', () => {
    it('stores the verified sub on the socket', async () => {
        const socket = makeSocket({ token: 'abc' });
        await expect(run(socket)).resolves.toBeUndefined();
        expect(socket.data.userSub).toBe(TEST_SUB);
    });

    it('rejects a handshake without a token', async () => {
        const socket = makeSocket({});
        await expect(run(socket)).resolves.toMatchObject({
            message: 'Unauthorized',
        });
        expect(socket.data.userSub).toBeUndefined();
    });

    it('rejects a token that fails verification', async () => {
        const reject = (_req: Request, _res: Response, next: NextFunction) =>
            next(new Error('bad token'));
        const socket = makeSocket({ token: 'forged' });
        await expect(run(socket, reject)).resolves.toMatchObject({
            message: 'Unauthorized',
        });
        expect(socket.data.userSub).toBeUndefined();
    });
});
