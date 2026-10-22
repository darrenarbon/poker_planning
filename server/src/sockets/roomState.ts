/**
 * Live state for each room that only matters while people are connected:
 * who is online, which ticket the facilitator has selected and the
 * discussion timer. Kept in memory, so it assumes a single server instance
 * and resets when the server restarts.
 */

export interface TimerState {
    ticketId: number | null;
    /** epoch milliseconds, so every client counts down to the same moment */
    endsAt: number;
}

interface RoomState {
    /** auth0 sub -> the ids of that user's open sockets */
    online: Map<string, Set<string>>;
    currentTicketId: number | null;
    timer: TimerState | null;
}

const rooms = new Map<string, RoomState>();

const stateFor = (roomName: string): RoomState => {
    let state = rooms.get(roomName);
    if (!state) {
        state = { online: new Map(), currentTicketId: null, timer: null };
        rooms.set(roomName, state);
    }
    return state;
};

export const addPresence = (
    roomName: string,
    userSub: string,
    socketId: string
) => {
    const { online } = stateFor(roomName);
    if (!online.has(userSub)) online.set(userSub, new Set());
    online.get(userSub)!.add(socketId);
};

/** Forgets a closed socket, returning the rooms whose online list changed. */
export const removeSocket = (socketId: string): string[] => {
    const changed: string[] = [];
    for (const [roomName, state] of rooms) {
        for (const [userSub, sockets] of state.online) {
            if (!sockets.delete(socketId)) continue;
            if (sockets.size === 0) {
                state.online.delete(userSub);
                changed.push(roomName);
            }
        }
        if (state.online.size === 0) {
            // nobody left: forget the room, including its selection and timer
            rooms.delete(roomName);
        }
    }
    return changed;
};

export const getOnlineSubs = (roomName: string): string[] => [
    ...(rooms.get(roomName)?.online.keys() ?? []),
];

export const getCurrentTicketId = (roomName: string) =>
    rooms.get(roomName)?.currentTicketId ?? null;

export const setCurrentTicketId = (
    roomName: string,
    ticketId: number | null
) => {
    stateFor(roomName).currentTicketId = ticketId;
};

export const getTimer = (roomName: string) =>
    rooms.get(roomName)?.timer ?? null;

export const setTimer = (roomName: string, timer: TimerState | null) => {
    stateFor(roomName).timer = timer;
};

/** For tests. */
export const resetRoomState = () => rooms.clear();
