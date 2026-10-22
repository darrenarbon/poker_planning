import { supabase } from '../db/supabase.js';
import type { Room, User } from '../types/models.js';
import { assertNoDbError } from '../utils/errors.js';

export const findRoomByName = async (
    roomName: string
): Promise<Room | undefined> => {
    const { data, error } = await supabase
        .from('room')
        .select()
        .eq('room_name', roomName);
    assertNoDbError(error, 'Error fetching room');
    return data?.[0];
};

export const findRoomWithAdminSub = async (
    roomName: string
): Promise<(Room & { auth0_sub: string }) | undefined> => {
    const { data, error } = await supabase
        .from('room')
        .select('*, ...user(auth0_sub)')
        .eq('room_name', roomName);
    assertNoDbError(error, 'Error fetching room');
    return data?.[0] as (Room & { auth0_sub: string }) | undefined;
};

export const findRoomsByAdmin = async (adminId: number): Promise<Room[]> => {
    const { data, error } = await supabase
        .from('room')
        .select()
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false });
    assertNoDbError(error, 'Error fetching rooms for user');
    return data ?? [];
};

export const createRoom = async (
    room: Pick<
        Room,
        'room_name' | 'admin_id' | 'friendly_name' | 'ticket_base_url'
    >
): Promise<Room> => {
    const { data, error } = await supabase.from('room').insert(room).select();
    assertNoDbError(error, 'Error creating room');
    return data![0];
};

export const findRoomUserIds = async (roomId: number): Promise<number[]> => {
    const { data, error } = await supabase
        .from('room_users')
        .select('user_id')
        .eq('room_id', roomId);
    assertNoDbError(error, 'Error fetching users');
    return (data ?? []).map((row) => row.user_id);
};

export const isUserInRoom = async (roomId: number, userId: number) => {
    const { data, error } = await supabase
        .from('room_users')
        .select()
        .eq('room_id', roomId)
        .eq('user_id', userId);
    assertNoDbError(error, 'Error getting user in room');
    return (data ?? []).length > 0;
};

export const addUserToRoom = async (roomId: number, userId: number) => {
    const { error } = await supabase
        .from('room_users')
        .insert({ room_id: roomId, user_id: userId });
    assertNoDbError(error, 'Error adding user to room');
};

export const findUsersInRoom = async (roomId: number): Promise<User[]> => {
    const { data, error } = await supabase
        .from('room_users')
        .select('user_id, user:user_id(*)')
        .eq('room_id', roomId);
    assertNoDbError(error, 'Error getting users in room');
    return (data ?? []).map((row) => ({
        ...(row.user as unknown as User),
        user_id: row.user_id,
    }));
};
