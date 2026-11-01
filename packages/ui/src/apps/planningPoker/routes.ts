export type RoomRouteParams = { roomName: string };

const base = '/poker';

export const pokerPaths = {
    home: base,
    newRoom: `${base}/rooms/new`,
    joinRoom: `${base}/rooms/join`,
    roomTickets: `${base}/room/:roomName/tickets`,
    roomVoting: `${base}/room/:roomName/voting`,
};

export const roomTicketsPath = (roomName: string) =>
    `${base}/room/${roomName}/tickets`;
export const roomVotingPath = (roomName: string) =>
    `${base}/room/${roomName}/voting`;

/** Where planning poker lived before Teamdeck had more than one app */
export const legacyPokerPaths = ['/rooms/*', '/room/*'];
