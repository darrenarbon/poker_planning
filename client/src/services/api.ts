import config from '../config';
import {
    JiraTicket,
    RoomDetails,
    RoomSummary,
    TicketForVoting,
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

    createRoom: async (roomName: string, baseUrl: string) =>
        (
            await requestJson<{ roomId: string }>(getToken, '/newroom', {
                method: 'POST',
                body: { roomName, baseUrl },
            })
        ).roomId,

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
