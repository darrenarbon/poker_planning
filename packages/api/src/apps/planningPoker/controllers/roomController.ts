import type { Request, Response } from 'express';

import * as roomService from '../services/roomService.js';
import * as ticketService from '../services/ticketService.js';
import { AppError } from '../../../utils/errors.js';

/** An optional list of strings from the body, or a 400. */
const optionalSubs = (value: unknown, name: string): string[] | undefined => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
        throw new AppError(400, `${name} must be a list of user ids`);
    }
    return value;
};

const MAX_YEARS_AHEAD = 5;

/**
 * A date and time as an ISO 8601 string, or a 400. Returned normalised to UTC
 * so every client reads the same moment whatever time zone it was sent in.
 */
const requireDateTime = (value: unknown, name: string): string => {
    const date =
        typeof value === 'string' && value.trim()
            ? new Date(value)
            : new Date(NaN);
    if (Number.isNaN(date.getTime())) {
        throw new AppError(400, `${name} must be a valid date and time`);
    }
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() + MAX_YEARS_AHEAD);
    if (date.getFullYear() < 2000 || date > limit) {
        throw new AppError(400, `${name} is not a sensible date`);
    }
    return date.toISOString();
};

export const createRoom = async (req: Request, res: Response) => {
    const {
        roomName,
        baseUrl,
        scheduledAt,
        teamId,
        memberSubs,
        coFacilitatorSubs,
    } = req.body;
    const when = requireDateTime(scheduledAt, 'scheduledAt');
    if (
        teamId !== undefined &&
        teamId !== null &&
        (!Number.isInteger(teamId) || teamId < 1)
    ) {
        throw new AppError(400, 'teamId must be a whole number');
    }
    const roomId = await roomService.createRoom(
        req.auth!.payload.sub!,
        roomName,
        baseUrl,
        {
            scheduledAt: when,
            teamId: teamId ?? undefined,
            memberSubs: optionalSubs(memberSubs, 'memberSubs'),
            coFacilitatorSubs: optionalSubs(
                coFacilitatorSubs,
                'coFacilitatorSubs'
            ),
        }
    );
    res.json({ roomId });
};

export const getRoom = async (req: Request, res: Response) => {
    res.json(
        await roomService.getRoomDetails(
            req.params.roomName,
            req.auth?.payload.sub
        )
    );
};

export const getRoomsForUser = async (req: Request, res: Response) => {
    const rooms = await roomService.getRoomsForUser(req.auth!.payload.sub!);
    res.json({ rooms });
};

export const addTickets = async (req: Request, res: Response) => {
    const { ticketsToSave } = req.body;
    if (!Array.isArray(ticketsToSave)) {
        throw new AppError(400, 'ticketsToSave must be an array');
    }
    await ticketService.addTicketsToRoom(
        req.params.roomName,
        req.auth!.payload.sub!,
        ticketsToSave
    );
    res.json({ message: 'Tickets added' });
};

export const addTicket = async (req: Request, res: Response) => {
    const { ticketNumber } = req.body;
    const [ticket] = await ticketService.addTicketsToRoom(
        req.params.roomName,
        req.auth!.payload.sub!,
        [ticketNumber]
    );
    res.json(ticket);
};

export const updateBaseUrl = async (req: Request, res: Response) => {
    const { baseUrl } = req.body;
    if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
        throw new AppError(400, 'baseUrl must be a non-empty string');
    }
    await roomService.updateBaseUrl(
        req.params.roomName,
        req.auth!.payload.sub!,
        baseUrl.trim()
    );
    res.json({ message: 'Base URL updated' });
};

const requireBoolean = (value: unknown, name: string): boolean => {
    if (typeof value !== 'boolean') {
        throw new AppError(400, `${name} must be true or false`);
    }
    return value;
};

export const setFavourite = async (req: Request, res: Response) => {
    const favourite = requireBoolean(req.body.favourite, 'favourite');
    await roomService.setFavourite(
        req.params.roomName,
        req.auth!.payload.sub!,
        favourite
    );
    res.json({ favourite });
};

export const setHidden = async (req: Request, res: Response) => {
    const hidden = requireBoolean(req.body.hidden, 'hidden');
    await roomService.setHidden(
        req.params.roomName,
        req.auth!.payload.sub!,
        hidden
    );
    res.json({ hidden });
};

export const addTeamMembers = async (req: Request, res: Response) => {
    const memberSubs = optionalSubs(req.body?.memberSubs, 'memberSubs');
    if (!memberSubs) {
        throw new AppError(400, 'memberSubs is required');
    }
    await roomService.addTeamMembersToRoom(
        req.params.roomName,
        req.auth!.payload.sub!,
        memberSubs
    );
    res.json({ message: 'People added' });
};

export const updateScheduledAt = async (req: Request, res: Response) => {
    const scheduledAt = requireDateTime(req.body?.scheduledAt, 'scheduledAt');
    await roomService.updateScheduledAt(
        req.params.roomName,
        req.auth!.payload.sub!,
        scheduledAt
    );
    res.json({ scheduledAt });
};
