import type { Request, Response } from 'express';

import * as holidayService from '../services/holidayService.js';
import { AppError } from '../utils/errors.js';

const sub = (req: Request) => req.auth!.payload.sub!;

const idParam = (req: Request, name: string): number => {
    const value = Number(req.params[name]);
    if (!Number.isInteger(value) || value < 1) {
        throw new AppError(400, `${name} must be a whole number`);
    }
    return value;
};

/**
 * Every holiday route exists twice: under /me for your own, and under
 * /users/:userId for a super admin or team owner/admin acting for someone
 * else. Without a :userId the holidays are the caller's own.
 */
const target = (req: Request) =>
    req.params.userId === undefined ? undefined : idParam(req, 'userId');

export const getHolidays = async (req: Request, res: Response) => {
    const from =
        typeof req.query.from === 'string' ? req.query.from : undefined;
    const holidays = await holidayService.getHolidays(
        sub(req),
        target(req),
        from
    );
    res.json({ holidays: holidays.map(holidayService.toHolidayDto) });
};

export const addHoliday = async (req: Request, res: Response) => {
    const holiday = await holidayService.addHoliday(
        sub(req),
        target(req),
        req.body
    );
    res.status(201).json(holidayService.toHolidayDto(holiday));
};

export const updateHoliday = async (req: Request, res: Response) => {
    const holiday = await holidayService.updateHoliday(
        sub(req),
        target(req),
        idParam(req, 'holidayId'),
        req.body
    );
    res.json(holidayService.toHolidayDto(holiday));
};

export const deleteHoliday = async (req: Request, res: Response) => {
    await holidayService.deleteHoliday(
        sub(req),
        target(req),
        idParam(req, 'holidayId')
    );
    res.json({ message: 'Holiday deleted' });
};

export const importBankHolidays = async (req: Request, res: Response) => {
    res.json(
        await holidayService.importBankHolidays(
            sub(req),
            target(req),
            req.body?.region,
            req.body?.subdivision
        )
    );
};

export const getTeamAbsences = async (req: Request, res: Response) => {
    const absences = await holidayService.getTeamAbsences(
        idParam(req, 'teamId'),
        sub(req),
        req.query.date,
        req.query.part
    );
    res.json({ absences });
};

export const getTeamLeave = async (req: Request, res: Response) => {
    const leave = await holidayService.getTeamLeave(
        idParam(req, 'teamId'),
        sub(req),
        req.query.from,
        req.query.to
    );
    res.json({ leave });
};
