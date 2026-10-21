export type RoomRouteParams = { roomName: string };

export const paths = {
    home: '/',
    roomTickets: '/room/:roomName/tickets',
    roomVoting: '/room/:roomName/voting',
};

export const roomTicketsPath = (roomName: string) =>
    `/room/${roomName}/tickets`;
export const roomVotingPath = (roomName: string) => `/room/${roomName}/voting`;
