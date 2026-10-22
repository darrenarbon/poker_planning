import type { NextFunction, Request, Response } from 'express';

export const corsHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
        'Access-Control-Allow-Methods',
        'GET,PUT,POST,DELETE,UPDATE,OPTIONS'
    );
    if (req.method === 'OPTIONS') {
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        );
        res.header(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, PATCH'
        );
        res.status(200).json({});
        return;
    }
    next();
};
