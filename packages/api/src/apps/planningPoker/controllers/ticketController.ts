import type { Request, Response } from 'express';

import * as ticketService from '../services/ticketService.js';

export const deleteTicket = async (req: Request, res: Response) => {
    await ticketService.deleteTicket(
        req.params.ticketId,
        req.auth!.payload.sub!
    );
    res.json({ message: 'Ticket deleted' });
};
