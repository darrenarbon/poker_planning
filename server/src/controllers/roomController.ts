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
    res.json(await roomService.getRoomDetails(req.params.roomName));
};

export const getRoomsForUser = async (req: Request, res: Response) => {
    const rooms = await roomService.getRoomsForUser(req.params.userSub);
    res.json({ rooms });
};

export const addTickets = async (req: Request, res: Response) => {
    const { ticketsToSave } = req.body;
    if (!Array.isArray(ticketsToSave)) {
        throw new AppError(400, 'ticketsToSave must be an array');
    }
    await ticketService.addTicketsToRoom(req.params.roomName, ticketsToSave);
    res.json({ message: 'Tickets added' });
};

export const addTicket = async (req: Request, res: Response) => {
    const { ticketNumber } = req.body;
    const [ticket] = await ticketService.addTicketsToRoom(req.params.roomName, [
        ticketNumber,
    ]);
    res.json(ticket);
};
