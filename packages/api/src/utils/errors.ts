import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Socket } from 'socket.io';

/** An error carrying the HTTP status and client-facing message to return. */
export class AppError extends Error {
    constructor(
        public status: number,
        message: string,
        public cause?: unknown
    ) {
        super(message);
    }
}

export const notFound = (message: string) => new AppError(404, message);

/** Throws a 500 AppError if a Supabase call returned an error. */
export const assertNoDbError = (error: unknown, message: string) => {
    if (error) {
        throw new AppError(500, message, error);
    }
};

const logError = (error: unknown) => {
    if (error instanceof AppError) {
        if (error.cause) console.error(error.cause);
        console.error(error.message);
    } else {
        console.error(error);
    }
};

/** Wraps an async route handler so thrown errors reach the error middleware. */
export const asyncHandler =
    (
        handler: (req: Request, res: Response) => Promise<unknown>
    ): RequestHandler =>
    (req, res, next) => {
        handler(req, res).catch(next);
    };

export const errorHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    if (res.headersSent) {
        return next(error);
    }
    // Let express-oauth2-jwt-bearer errors keep their own status (401 etc.)
    const status =
        error instanceof AppError
            ? error.status
            : ((error as { status?: number }).status ?? 500);
    if (error instanceof AppError || status >= 500) {
        logError(error);
    }
    const message =
        error instanceof AppError
            ? error.message
            : status === 500
              ? 'Internal server error'
              : (error as Error).message;
    res.status(status).json({ error: message });
};

/** Wraps a socket event handler so thrown errors are emitted to the client. */
export const socketHandler =
    <T>(socket: Socket, handler: (payload: T) => Promise<void>) =>
    async (payload: T) => {
        try {
            await handler(payload);
        } catch (error) {
            logError(error);
            socket.emit(
                'error',
                error instanceof AppError
                    ? error.message
                    : 'Internal server error'
            );
        }
    };
