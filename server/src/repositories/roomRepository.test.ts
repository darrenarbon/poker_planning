import { describe, expect, it, vi } from 'vitest';

import { supabase } from '../db/supabase.js';
import { makeRoom, makeUser } from '../test/factories.js';
import { fail, ok, queueResults } from '../test/supabaseMock.js';
import {
    addUserToRoom,
    createRoom,
    findRoomByName,
    findRoomsByAdmin,
    findRoomUserIds,
    findUsersInRoom,
    isUserInRoom,
    findMembership,
    findMemberships,
    updateMembership,
    updateRoomBaseUrl,
    updateRoomHidden,
} from './roomRepository.js';

vi.mock('../db/supabase.js', () => ({ supabase: { from: vi.fn() } }));
const from = vi.mocked(supabase.from) as unknown as ReturnType<typeof vi.fn>;

describe('roomRepository', () => {
    it('findRoomByName returns the matching room', async () => {
        const room = makeRoom();
        const [query] = queueResults(from, ok([room]));
        await expect(findRoomByName('abc')).resolves.toEqual(room);
        expect(query.eq).toHaveBeenCalledWith('room_name', 'abc');
    });

    it('findRoomByName throws on a db error', async () => {
        queueResults(from, fail());
        await expect(findRoomByName('abc')).rejects.toMatchObject({
            message: 'Error fetching room',
        });
    });

    it('findRoomsByAdmin orders newest first', async () => {
        const [query] = queueResults(from, ok([makeRoom()]));
        await findRoomsByAdmin(1);
        expect(query.eq).toHaveBeenCalledWith('admin_id', 1);
        expect(query.order).toHaveBeenCalledWith('created_at', {
            ascending: false,
        });
    });

    it('createRoom inserts and returns the new room', async () => {
        const room = makeRoom();
        const [query] = queueResults(from, ok([room]));
        const input = {
            room_name: room.room_name,
            admin_id: 1,
            friendly_name: room.friendly_name,
            ticket_base_url: room.ticket_base_url,
        };
        await expect(createRoom(input)).resolves.toEqual(room);
        expect(query.insert).toHaveBeenCalledWith(input);
    });

    it('findRoomUserIds maps rows to ids', async () => {
        queueResults(from, ok([{ user_id: 1 }, { user_id: 2 }]));
        await expect(findRoomUserIds(10)).resolves.toEqual([1, 2]);
    });

    it('isUserInRoom reflects whether a row exists', async () => {
        queueResults(from, ok([{ room_id: 10, user_id: 1 }]), ok([]));
        await expect(isUserInRoom(10, 1)).resolves.toBe(true);
        await expect(isUserInRoom(10, 2)).resolves.toBe(false);
    });

    it('addUserToRoom inserts a room_users row', async () => {
        const [query] = queueResults(from, ok(null));
        await addUserToRoom(10, 1);
        expect(from).toHaveBeenCalledWith('room_users');
        expect(query.insert).toHaveBeenCalledWith({ room_id: 10, user_id: 1 });
    });

    it('findUsersInRoom flattens the joined user', async () => {
        const user = makeUser();
        queueResults(from, ok([{ user_id: 1, user }]));
        await expect(findUsersInRoom(10)).resolves.toEqual([user]);
    });

    it('updateRoomBaseUrl updates the room by id', async () => {
        const [query] = queueResults(from, ok(null));
        await updateRoomBaseUrl(10, 'https://new');
        expect(query.update).toHaveBeenCalledWith({
            ticket_base_url: 'https://new',
        });
        expect(query.eq).toHaveBeenCalledWith('room_id', 10);
    });

    it('findMemberships joins each room for the user', async () => {
        const [query] = queueResults(from, ok([]));
        await findMemberships(1);
        expect(query.select).toHaveBeenCalledWith(
            'favourite, last_joined_at, room:room_id(*)'
        );
        expect(query.eq).toHaveBeenCalledWith('user_id', 1);
    });

    it('findMembership returns the first row', async () => {
        const row = { favourite: true, last_joined_at: null };
        queueResults(from, ok([row]));
        await expect(findMembership(10, 1)).resolves.toEqual(row);
    });

    it('updateMembership updates the user row in the room', async () => {
        const [query] = queueResults(from, ok(null));
        await updateMembership(10, 1, { favourite: true });
        expect(query.update).toHaveBeenCalledWith({ favourite: true });
        expect(query.eq).toHaveBeenCalledWith('room_id', 10);
        expect(query.eq).toHaveBeenCalledWith('user_id', 1);
    });

    it('updateRoomHidden updates the room', async () => {
        const [query] = queueResults(from, ok(null));
        await updateRoomHidden(10, true);
        expect(query.update).toHaveBeenCalledWith({ hidden: true });
        expect(query.eq).toHaveBeenCalledWith('room_id', 10);
    });
});
