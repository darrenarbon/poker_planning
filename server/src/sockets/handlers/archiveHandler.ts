import type { Server, Socket } from 'socket.io';

import * as ticketService from '../../services/ticketService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import { setCurrentTicketId, setTimer } from '../roomState.js';
import type { RoomPayload } from '../types.js';

/** The facilitator starts a new sprint: the current tickets are archived. */
export const registerArchiveHandler = (socket: Socket, io: Server) => {
    socket.on(
        'archiveSprint',
        socketHandler(socket, async ({ roomName }: RoomPayload) => {
            const userSub = getUserSub(socket);
            assertInRoom(socket, roomName);
            const archivedAt = await ticketService.archiveSprint(
                roomName,
                userSub
            );
            setCurrentTicketId(roomName, null);
            setTimer(roomName, null);
            io.in(roomName).emit('sprintArchived', { archivedAt });
        })
    );
};
