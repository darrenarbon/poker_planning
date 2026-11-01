/** Pages shared by every app; each app keeps its own paths in apps/<app>/routes.ts */
export const paths = {
    home: '/',
    settings: '/settings',
    holidays: '/annual-leave',
    teams: '/teams',
    team: '/teams/:teamId',
    invite: '/invite/:token',
};

export const teamPath = (teamId: number | string) => `/teams/${teamId}`;
export const invitePath = (token: string) => `/invite/${token}`;
