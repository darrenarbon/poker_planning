import type { NextFunction, Request, Response } from 'express';
import type { Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AppError,
    assertNoDbError,
    asyncHandler,
    errorHandler,
    notFound,
    socketHandler,
} from './errors.js';

const makeRes = (headersSent = false) => {
    const res = { headersSent } as Response & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
};

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('notFound', () => {
    it('creates a 404 AppError', () => {
        const error = notFound('Room not found');
        expect(error).toBeInstanceOf(AppError);
        expect(error.status).toBe(404);
        expect(error.message).toBe('Room not found');
    });
});

describe('assertNoDbError', () => {
    it('does nothing when there is no error', () => {
        expect(() => assertNoDbError(null, 'boom')).not.toThrow();
    });

    it('throws a 500 AppError carrying the db error', () => {
        const dbError = { message: 'db down' };
        try {
            assertNoDbError(dbError, 'Error fetching room');
            expect.unreachable();
        } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect((error as AppError).status).toBe(500);
            expect((error as AppError).message).toBe('Error fetching room');
            expect((error as AppError).cause).toBe(dbError);
        }
    });
});

describe('asyncHandler', () => {
    it('passes rejected errors to next', async () => {
        const error = new Error('nope');
        const next = vi.fn();
        asyncHandler(async () => {
            throw error;
        })({} as Request, {} as Response, next);
        await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
    });

    it('does not call next on success', async () => {
        const next = vi.fn();
        const handler = vi.fn(async () => {});
        asyncHandler(handler)({} as Request, {} as Response, next);
        await vi.waitFor(() => expect(handler).toHaveBeenCalled());
        expect(next).not.toHaveBeenCalled();
    });
});

describe('errorHandler', () => {
    const run = (error: unknown, res = makeRes()) => {
        const next = vi.fn() as NextFunction;
        errorHandler(error, {} as Request, res, next);
        return { res, next };
    };

    it('responds with an AppError status and message', () => {
        const { res } = run(new AppError(404, 'Ticket not found'));
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Ticket not found' });
    });

    it('hides the message of unexpected errors', () => {
        const { res } = run(new Error('secret details'));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Internal server error',
        });
        expect(console.error).toHaveBeenCalled();
    });

    it('keeps the status of errors that carry one (e.g. auth)', () => {
        const authError = Object.assign(new Error('Unauthorized'), {
            status: 401,
        });
        const { res } = run(authError);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
        expect(console.error).not.toHaveBeenCalled();
    });

    it('delegates to next if headers were already sent', () => {
        const error = new Error('late');
        const { res, next } = run(error, makeRes(true));
        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('socketHandler', () => {
    const socket = { emit: vi.fn() } as unknown as Socket & {
        emit: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => socket.emit.mockClear());

    it('passes the payload to the handler', async () => {
        const handler = vi.fn(async () => {});
        await socketHandler(socket, handler)({ a: 1 });
        expect(handler).toHaveBeenCalledWith({ a: 1 });
        expect(socket.emit).not.toHaveBeenCalled();
    });

    it('emits AppError messages to the client', async () => {
        await socketHandler(socket, async () => {
            throw notFound('Room not found');
        })({});
        expect(socket.emit).toHaveBeenCalledWith('error', 'Room not found');
    });

    it('emits a generic message for unexpected errors', async () => {
        await socketHandler(socket, async () => {
            throw new Error('secret');
        })({});
        expect(socket.emit).toHaveBeenCalledWith(
            'error',
            'Internal server error'
        );
    });
});
