import type { Socket } from 'socket.io';

import { AppError } from '../utils/errors.js';

/** The authenticated caller, as set by the socketAuth middleware. */
export const getUserSub = (socket: Socket): string => {
    const userSub = socket.data?.userSub;
    if (typeof userSub !== 'string' || !userSub) {
        throw new AppError(401, 'Unauthorized');
    }
    return userSub;
};

/** Throws unless this socket has joined the room via the join event. */
export const assertInRoom = (socket: Socket, roomName: string) => {
    if (!socket.rooms?.has(roomName)) {
        throw new AppError(403, 'Join the room first');
    }
};
