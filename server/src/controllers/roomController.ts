import type { Request, Response } from 'express';

import * as roomService from '../services/roomService.js';
import * as ticketService from '../services/ticketService.js';
import { AppError } from '../utils/errors.js';

export const createRoom = async (req: Request, res: Response) => {
    const { roomName, baseUrl } = req.body;
    const roomId = await roomService.createRoom(
        req.auth!.payload.sub!,
        roomName,
        baseUrl
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
