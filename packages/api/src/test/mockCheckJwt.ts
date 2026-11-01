import type { NextFunction, Request, Response } from 'express';

export const TEST_SUB = 'auth0|tester';

/**
 * Stand-in for the Auth0 middleware: requests with any bearer token are
 * authenticated as TEST_SUB, requests without one get a 401.
 */
export const fakeCheckJwt = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    if (!req.headers.authorization?.startsWith('Bearer ')) {
        return next(Object.assign(new Error('Unauthorized'), { status: 401 }));
    }
    req.auth = {
        payload: { sub: TEST_SUB },
        header: { alg: 'none' },
        token: 'test-token',
    };
    next();
};
