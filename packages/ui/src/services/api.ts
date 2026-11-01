import config from '../config';
import {
    AssignableTeamRole,
    BankHolidayRegion,
    Holiday,
    HolidayInput,
    InvitePreview,
    JiraTicket,
    MyTeams,
    NewRoomOptions,
    RoomDetails,
    RoomSummary,
    TeamAbsence,
    TeamLeave,
    TeamDetails,
    TeamInvite,
    TeamRole,
    TicketForVoting,
    UserProfile,
    UserSettings,
} from '../types';
import { User } from '@auth0/auth0-react';
import { mapJiraTicket } from '../utils';

export type GetToken = () => Promise<string>;

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number
    ) {
        super(message);
    }
}

const request = async (
    getToken: GetToken,
    path: string,
    init: { method?: string; body?: unknown } = {}
): Promise<Response> => {
    const token = await getToken();
    const response = await fetch(`${config.apiUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!response.ok) {
        throw new ApiError(
            `${init.method ?? 'GET'} ${path} failed`,
            response.status
        );
    }
    return response;
};

const requestJson = async <T>(
    ...args: Parameters<typeof request>
): Promise<T> => (await request(...args)).json() as Promise<T>;

/** Your own holidays, or someone else's when acting on their behalf */
const holidaysPath = (userId?: number) =>
    userId === undefined ? '/me/holidays' : `/users/${userId}/holidays`;

export const createApi = (getToken: GetToken) => ({
    login: (user: User | undefined) =>
        request(getToken, '/login', { method: 'POST', body: { user } }),

    getUserRooms: async () =>
        (await requestJson<{ rooms: RoomSummary[] }>(getToken, '/me/rooms'))
            .rooms,

    getSettings: () => requestJson<UserSettings>(getToken, '/me/settings'),

    saveSettings: (settings: UserSettings) =>
        requestJson<UserSettings>(getToken, '/me/settings', {
            method: 'PUT',
            body: settings,
        }),

    getProfile: () => requestJson<UserProfile>(getToken, '/me/profile'),

    saveProfile: (profile: UserProfile) =>
        requestJson<UserProfile>(getToken, '/me/profile', {
            method: 'PUT',
            body: profile,
        }),

    createRoom: async (
        roomName: string,
        baseUrl: string,
        scheduledAt: string,
        team?: NewRoomOptions
    ) =>
        (
            await requestJson<{ roomId: string }>(getToken, '/newroom', {
                method: 'POST',
                body: { roomName, baseUrl, scheduledAt, ...team },
            })
        ).roomId,

    updateRoomSchedule: (roomName: string, scheduledAt: string) =>
        request(getToken, `/room/${roomName}/scheduledAt`, {
            method: 'PUT',
            body: { scheduledAt },
        }),

    getHolidays: async (userId?: number) =>
        (
            await requestJson<{ holidays: Holiday[] }>(
                getToken,
                holidaysPath(userId)
            )
        ).holidays,

    addHoliday: (holiday: HolidayInput, userId?: number) =>
        requestJson<Holiday>(getToken, holidaysPath(userId), {
            method: 'POST',
            body: holiday,
        }),

    updateHoliday: (
        holidayId: number,
        holiday: HolidayInput,
        userId?: number
    ) =>
        requestJson<Holiday>(getToken, `${holidaysPath(userId)}/${holidayId}`, {
            method: 'PUT',
            body: holiday,
        }),

    deleteHoliday: (holidayId: number, userId?: number) =>
        request(getToken, `${holidaysPath(userId)}/${holidayId}`, {
            method: 'DELETE',
        }),

    importBankHolidays: (
        region: BankHolidayRegion,
        subdivision?: string,
        userId?: number
    ) =>
        requestJson<{ added: number }>(
            getToken,
            `${holidaysPath(userId)}/bank-holidays`,
            { method: 'POST', body: { region, subdivision } }
        ),

    getTeamAbsences: async (
        teamId: number | string,
        date: string,
        part: 'am' | 'pm'
    ) =>
        (
            await requestJson<{ absences: TeamAbsence[] }>(
                getToken,
                `/teams/${teamId}/absences?date=${date}&part=${part}`
            )
        ).absences,

    getTeamLeave: async (teamId: number | string, from: string, to: string) =>
        (
            await requestJson<{ leave: TeamLeave[] }>(
                getToken,
                `/teams/${teamId}/leave?from=${from}&to=${to}`
            )
        ).leave,

    getMyTeams: () => requestJson<MyTeams>(getToken, '/me/teams'),

    createTeam: (name: string) =>
        requestJson<{ team_id: number; name: string }>(getToken, '/teams', {
            method: 'POST',
            body: { name },
        }),

    getTeam: (teamId: number | string) =>
        requestJson<TeamDetails>(getToken, `/teams/${teamId}`),

    renameTeam: (teamId: number, name: string) =>
        request(getToken, `/teams/${teamId}`, {
            method: 'PUT',
            body: { name },
        }),

    deleteTeam: (teamId: number) =>
        request(getToken, `/teams/${teamId}`, { method: 'DELETE' }),

    addTeamMember: (
        teamId: number,
        email: string,
        role: AssignableTeamRole = 'member'
    ) =>
        request(getToken, `/teams/${teamId}/members`, {
            method: 'POST',
            body: { email, role },
        }),

    changeTeamMemberRole: (
        teamId: number,
        userId: number,
        role: Exclude<TeamRole, 'owner'>
    ) =>
        request(getToken, `/teams/${teamId}/members/${userId}`, {
            method: 'PUT',
            body: { role },
        }),

    removeTeamMember: (teamId: number, userId: number) =>
        request(getToken, `/teams/${teamId}/members/${userId}`, {
            method: 'DELETE',
        }),

    transferTeamOwnership: (teamId: number, userId: number) =>
        request(getToken, `/teams/${teamId}/owner`, {
            method: 'POST',
            body: { userId },
        }),

    getTeamInvites: async (teamId: number) =>
        (
            await requestJson<{ invites: TeamInvite[] }>(
                getToken,
                `/teams/${teamId}/invites`
            )
        ).invites,

    createTeamInvite: (
        teamId: number,
        role: AssignableTeamRole = 'member',
        expiresInDays = 7
    ) =>
        requestJson<TeamInvite>(getToken, `/teams/${teamId}/invites`, {
            method: 'POST',
            body: { role, expiresInDays },
        }),

    revokeTeamInvite: (teamId: number, inviteId: number) =>
        request(getToken, `/teams/${teamId}/invites/${inviteId}`, {
            method: 'DELETE',
        }),

    previewInvite: (token: string) =>
        requestJson<InvitePreview>(getToken, `/invites/${token}`),

    acceptInvite: (token: string) =>
        requestJson<{ teamId: number }>(getToken, `/invites/${token}/accept`, {
            method: 'POST',
        }),

    getRoom: (roomName: string) =>
        requestJson<RoomDetails>(getToken, `/room/${roomName}`),

    saveTickets: (roomName: string, ticketsToSave: string[]) =>
        request(getToken, `/room/${roomName}/tickets`, {
            method: 'POST',
            body: { ticketsToSave },
        }),

    setFavourite: (roomName: string, favourite: boolean) =>
        request(getToken, `/room/${roomName}/favourite`, {
            method: 'PUT',
            body: { favourite },
        }),

    setHidden: (roomName: string, hidden: boolean) =>
        request(getToken, `/room/${roomName}/hidden`, {
            method: 'PUT',
            body: { hidden },
        }),

    updateBaseUrl: (roomName: string, baseUrl: string) =>
        request(getToken, `/room/${roomName}/baseUrl`, {
            method: 'PUT',
            body: { baseUrl },
        }),

    addTicket: async (
        roomName: string,
        ticketNumber: string
    ): Promise<TicketForVoting> => {
        const ticket = await requestJson<TicketForVoting>(
            getToken,
            `/room/${roomName}/newTicket`,
            { method: 'POST', body: { ticketNumber } }
        );
        return { ...ticket, votes: [] };
    },

    deleteTicket: (ticketId: string) =>
        request(getToken, `/ticket/${ticketId}`, { method: 'DELETE' }),

    getJiraTicket: async (ticketNumber: string): Promise<JiraTicket> =>
        mapJiraTicket(
            await requestJson(getToken, `/jiraticket/${ticketNumber}`)
        ),
});

export type Api = ReturnType<typeof createApi>;
