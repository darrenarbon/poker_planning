import { User } from '@auth0/auth0-react';
import { Room, RoomSummary, TicketForVoting, UserModel } from '../types';

export const makeTicket = (
    overrides: Partial<TicketForVoting> = {}
): TicketForVoting => ({
    ticket_id: 't1',
    ticket_number: 'ABC-1',
    votes: [],
    ...overrides,
});

export const makeUserModel = (
    overrides: Partial<UserModel> = {}
): UserModel => ({
    auth0_sub: 'user-1',
    given_name: 'Ada',
    family_name: 'Lovelace',
    nickname: 'ada.lovelace',
    ...overrides,
});

export const makeAuthUser = (overrides: Partial<User> = {}): User => ({
    sub: 'user-1',
    given_name: 'Ada',
    family_name: 'Lovelace',
    nickname: 'ada.lovelace',
    ...overrides,
});

export const makeRoom = (overrides: Partial<Room> = {}): Room => ({
    adminSub: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
    friendlyName: 'Sprint Planning',
    roomId: 1,
    roomName: 'room-abc',
    ticketBaseUrl: 'https://jira.example.com/browse',
    ...overrides,
});

export const makeRoomSummary = (
    overrides: Partial<RoomSummary> = {}
): RoomSummary => ({
    room_id: 1,
    room_name: 'room-abc',
    created_at: '2026-03-05T10:00:00Z',
    admin_id: 1,
    friendly_name: 'Sprint Planning',
    ...overrides,
});
