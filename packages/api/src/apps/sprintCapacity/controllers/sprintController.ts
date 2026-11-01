import type { Request, Response } from 'express';

import { AppError } from '../../../utils/errors.js';
import * as sprintService from '../services/sprintService.js';

const sub = (req: Request) => req.auth!.payload.sub!;

const idParam = (req: Request, name: string): number => {
    const value = Number(req.params[name]);
    if (!Number.isInteger(value) || value < 1) {
        throw new AppError(400, `${name} must be a whole number`);
    }
    return value;
};

export const getSprints = async (req: Request, res: Response) => {
    res.json(await sprintService.getSprints(idParam(req, 'teamId'), sub(req)));
};

export const getForecast = async (req: Request, res: Response) => {
    res.json(
        await sprintService.getForecast(
            idParam(req, 'teamId'),
            sub(req),
            req.query
        )
    );
};

export const getSprint = async (req: Request, res: Response) => {
    res.json(
        await sprintService.getSprint(
            idParam(req, 'teamId'),
            idParam(req, 'sprintId'),
            sub(req)
        )
    );
};

export const createSprint = async (req: Request, res: Response) => {
    res.status(201).json(
        await sprintService.createSprint(
            idParam(req, 'teamId'),
            sub(req),
            req.body
        )
    );
};

export const updateSprint = async (req: Request, res: Response) => {
    res.json(
        await sprintService.updateSprint(
            idParam(req, 'teamId'),
            idParam(req, 'sprintId'),
            sub(req),
            req.body
        )
    );
};

export const deleteSprint = async (req: Request, res: Response) => {
    await sprintService.deleteSprint(
        idParam(req, 'teamId'),
        idParam(req, 'sprintId'),
        sub(req)
    );
    res.json({ message: 'Sprint deleted' });
};

export const startSprint = async (req: Request, res: Response) => {
    res.json(
        await sprintService.startSprint(
            idParam(req, 'teamId'),
            idParam(req, 'sprintId'),
            sub(req)
        )
    );
};

export const closeSprint = async (req: Request, res: Response) => {
    res.json(
        await sprintService.closeSprint(
            idParam(req, 'teamId'),
            idParam(req, 'sprintId'),
            sub(req),
            req.body
        )
    );
};
