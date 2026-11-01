import { createHmac } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./checkJwt.js', () => ({ checkJwt: vi.fn() }));

import { fakeCheckJwt, TEST_SUB } from '../test/mockCheckJwt.js';
import { createSocketAuth } from './socketAuth.js';

const makeSocket = (auth: Record<string, unknown>) =>
    ({
        handshake: {
            auth,
            headers: { host: 'localhost:3000' },
            secure: false,
            url: '/socket.io/?EIO=4&transport=websocket',
        },
        data: {},
    }) as unknown as Socket;

const run = (socket: Socket, verify = fakeCheckJwt) =>
    new Promise<Error | undefined>((resolve) =>
        createSocketAuth(verify as never)(socket, resolve)
    );

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

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

// Runs the real express-oauth2-jwt-bearer check, which reads more of the
// request than the token (e.g. the Host header), against a locally signed token
describe('socketAuth with the real token check', () => {
    const SECRET = 'a-test-secret-that-is-at-least-32-bytes';
    const ISSUER = 'https://issuer.test/';
    const AUDIENCE = 'http://audience.test';

    const base64url = (value: object | Buffer) =>
        (Buffer.isBuffer(value)
            ? value
            : Buffer.from(JSON.stringify(value))
        ).toString('base64url');

    const signToken = (claims: Record<string, unknown>) => {
        const now = Math.floor(Date.now() / 1000);
        const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(
            { iss: ISSUER, aud: AUDIENCE, iat: now, exp: now + 60, ...claims }
        )}`;
        const signature = createHmac('sha256', SECRET)
            .update(unsigned)
            .digest();
        return `${unsigned}.${base64url(signature)}`;
    };

    const realCheck = auth({
        issuer: ISSUER,
        audience: AUDIENCE,
        secret: SECRET,
        tokenSigningAlg: 'HS256',
    });

    it('accepts a valid token', async () => {
        const socket = makeSocket({ token: signToken({ sub: 'auth0|real' }) });
        await expect(run(socket, realCheck as never)).resolves.toBeUndefined();
        expect(socket.data.userSub).toBe('auth0|real');
    });

    it('rejects a token for another audience', async () => {
        const socket = makeSocket({
            token: signToken({ sub: 'auth0|real', aud: 'http://elsewhere' }),
        });
        await expect(run(socket, realCheck as never)).resolves.toMatchObject({
            message: 'Unauthorized',
        });
        expect(socket.data.userSub).toBeUndefined();
    });
});
