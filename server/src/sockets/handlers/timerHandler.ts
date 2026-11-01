import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import { AppError, socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import { getCurrentTicketId, setTimer } from '../roomState.js';
import type { RoomPayload, StartTimerPayload } from '../types.js';

const MAX_TIMER_SECONDS = 60 * 60;

/** The facilitator starts or stops a discussion countdown for the room. */
export const registerTimerHandler = (socket: Socket, io: Server) => {
    socket.on(
        'startTimer',
        socketHandler(
            socket,
            async ({ roomName, seconds }: StartTimerPayload) => {
                const userSub = getUserSub(socket);
                if (
                    !Number.isInteger(seconds) ||
                    seconds < 1 ||
                    seconds > MAX_TIMER_SECONDS
                ) {
                    throw new AppError(
                        400,
                        'The timer must be between 1 second and 60 minutes'
                    );
                }
                assertInRoom(socket, roomName);
                await roomService.getRoomAsAdmin(roomName, userSub);
                const endsAt = Date.now() + seconds * 1000;
                setTimer(roomName, {
                    ticketId: getCurrentTicketId(roomName),
                    endsAt,
                });
                io.in(roomName).emit('timer', { endsAt });
            }
        )
    );

    socket.on(
        'stopTimer',
        socketHandler(socket, async ({ roomName }: RoomPayload) => {
            const userSub = getUserSub(socket);
            assertInRoom(socket, roomName);
            await roomService.getRoomAsAdmin(roomName, userSub);
            setTimer(roomName, null);
            io.in(roomName).emit('timer', { endsAt: null });
        })
    );
};
