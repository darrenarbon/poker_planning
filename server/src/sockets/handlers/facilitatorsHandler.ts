import type { Server, Socket } from 'socket.io';

import * as roomService from '../../services/roomService.js';
import { socketHandler } from '../../utils/errors.js';
import { assertInRoom, getUserSub } from '../guards.js';
import type { FacilitatorPayload } from '../types.js';

type FacilitatorChange = (
    roomName: string,
    ownerSub: string,
    targetSub: string
) => Promise<void>;

/** Owner-only changes to who runs the room, then tells everyone the result. */
const changes: Record<string, FacilitatorChange> = {
    addCoFacilitator: roomService.addCoFacilitator,
    removeCoFacilitator: roomService.removeCoFacilitator,
    handOver: roomService.handOverRoom,
};

export const registerFacilitatorsHandler = (socket: Socket, io: Server) => {
    for (const [event, change] of Object.entries(changes)) {
        socket.on(
            event,
            socketHandler(
                socket,
                async ({
                    roomName,
                    userSub: targetSub,
                }: FacilitatorPayload) => {
                    const userSub = getUserSub(socket);
                    assertInRoom(socket, roomName);
                    await change(roomName, userSub, targetSub);
                    io.in(roomName).emit(
                        'facilitators',
                        await roomService.getFacilitators(roomName)
                    );
                }
            )
        );
    }
};
