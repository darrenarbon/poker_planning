import { supabaseConnection } from '../../database';
import type {
    UserData,
    RoomData,
    RoomUserData,
    VoteData,
    TicketData,
} from '../types/socketTypes';

/**
 * Database operations for socket functionality
 * Encapsulates all Supabase queries with proper error handling
 */

export const findRoomByName = async (
    roomName: string
): Promise<{ data: RoomData[] | null; error: any }> => {
    return await supabaseConnection
        .from('room')
        .select()
        .eq('room_name', roomName);
};

export const findUserByAuth0Sub = async (
    userSub: string
): Promise<{ data: UserData[] | null; error: any }> => {
    return await supabaseConnection
        .from('user')
        .select()
        .eq('auth0_sub', userSub);
};

export const findUserInRoom = async (
    roomId: number,
    userId: number
): Promise<{ data: any[] | null; error: any }> => {
    return await supabaseConnection
        .from('room_users')
        .select()
        .eq('room_id', roomId)
        .eq('user_id', userId);
};

export const addUserToRoom = async (
    roomId: number,
    userId: number
): Promise<{ error: any }> => {
    return await supabaseConnection.from('room_users').insert({
        room_id: roomId,
        user_id: userId,
    });
};

export const getUsersInRoom = async (
    roomId: number
): Promise<{ data: RoomUserData[] | null; error: any }> => {
    return await supabaseConnection
        .from('room_users')
        .select(
            `
            *,
            user:user_id(*)
        `
        )
        .eq('room_id', roomId);
};

export const findExistingVote = async (
    ticketId: number,
    userId: number
): Promise<{ data: VoteData[] | null; error: any }> => {
    return await supabaseConnection
        .from('vote')
        .select()
        .eq('ticket_id', ticketId)
        .eq('user_id', userId);
};

export const updateVote = async (
    voteId: number,
    vote: number
): Promise<{ error: any }> => {
    return await supabaseConnection
        .from('vote')
        .update({ vote })
        .eq('vote_id', voteId);
};

export const insertVote = async (
    ticketId: number,
    vote: number,
    userId: number
): Promise<{ error: any }> => {
    return await supabaseConnection.from('vote').insert({
        ticket_id: ticketId,
        vote,
        user_id: userId,
    });
};

export const findTicketById = async (
    ticketId: number
): Promise<{ data: TicketData[] | null; error: any }> => {
    return await supabaseConnection
        .from('ticket')
        .select()
        .eq('ticket_id', ticketId);
};

export const findRoomById = async (
    roomId: number
): Promise<{ data: RoomData[] | null; error: any }> => {
    return await supabaseConnection.from('room').select().eq('room_id', roomId);
};

export const findRoomByIdAndName = async (
    roomId: number,
    roomName: string
): Promise<{ data: RoomData[] | null; error: any }> => {
    return await supabaseConnection
        .from('room')
        .select()
        .eq('room_id', roomId)
        .eq('room_name', roomName);
};

export const updateTicketEstimate = async (
    ticketId: number,
    chosenEstimate: number,
    averageVote: number,
    standardDeviation: number
): Promise<{ error: any }> => {
    return await supabaseConnection
        .from('ticket')
        .update({
            chosen_estimate: chosenEstimate,
            average_vote: averageVote,
            standard_deviation: standardDeviation,
        })
        .eq('ticket_id', ticketId);
};
