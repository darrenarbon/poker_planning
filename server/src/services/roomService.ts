import { v4 as uuidv4 } from 'uuid';
import { supabaseConnection } from '../database';
import { getUserDetails } from '../routes/routeHelper';
import {
    CreateRoomResult,
    AddTicketsResult,
    RoomDetailsResult,
    Room,
    User,
    TicketWithVotes,
    RoomResponse,
    ServiceResult,
} from '../types/room';

/**
 * Creates a new room with the given parameters
 * @param roomName - The friendly name for the room
 * @param baseUrl - Optional base URL for tickets
 * @param userSub - The Auth0 sub of the user creating the room
 * @returns Promise with room creation result
 */
export const createRoom = async (
    roomName: string,
    baseUrl: string | undefined,
    userSub: string
): Promise<CreateRoomResult> => {
    try {
        // Validate input
        if (!roomName || !userSub) {
            return {
                success: false,
                error: 'Missing required parameters',
                message: 'Room name and user authentication are required',
                status: 400,
            };
        }

        // Get user details
        const userInDB = await getUserDetails(userSub);
        if (!userInDB) {
            return {
                success: false,
                error: 'User not found',
                message: 'User not found in database',
                status: 404,
            };
        }

        // Generate unique room ID
        const roomUUID = uuidv4().substring(0, 10);

        // Create room
        const { data, error: createRoomError } = await supabaseConnection
            .from('room')
            .insert([
                {
                    room_name: roomUUID,
                    admin_id: userInDB.user_id,
                    friendly_name: roomName,
                    ticket_base_url: baseUrl,
                },
            ])
            .select();

        if (createRoomError) {
            return {
                success: false,
                error: createRoomError,
                message: 'Error creating room',
                status: 500,
            };
        }

        // Add user to room
        const { error: addUsertoRoomError } = await supabaseConnection
            .from('room_users')
            .insert([{ room_id: data[0].room_id, user_id: userInDB.user_id }]);

        if (addUsertoRoomError) {
            return {
                success: false,
                error: addUsertoRoomError,
                message: 'Error adding user to room',
                status: 500,
            };
        }

        return {
            success: true,
            data: {
                roomId: roomUUID,
                roomData: data[0],
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error during room creation',
            status: 500,
        };
    }
};

/**
 * Adds multiple tickets to a room
 * @param roomId - The room identifier (numerical string like '1', '2', etc.)
 * @param ticketsToSave - Array of ticket numbers to add
 * @returns Promise with tickets addition result
 */
export const addTicketsToRoom = async (
    roomId: string,
    ticketsToSave: string[]
): Promise<AddTicketsResult> => {
    try {
        // Validate input
        if (!roomId || !ticketsToSave || !Array.isArray(ticketsToSave)) {
            return {
                success: false,
                error: 'Invalid parameters',
                message: 'Room ID and tickets array are required',
                status: 400,
            };
        }

        // Find room
        const { data, error: findRoomError } = await supabaseConnection
            .from('room')
            .select()
            .eq('room_id', roomId);

        if (findRoomError) {
            return {
                success: false,
                error: findRoomError,
                message: 'Error fetching room',
                status: 500,
            };
        }

        if (data.length === 0) {
            return {
                success: false,
                error: 'Room not found',
                message: 'Room not found',
                status: 404,
            };
        }

        // Prepare tickets data
        const ticketsArray = ticketsToSave.map((ticket: string) => ({
            room_id: roomId,
            ticket_number: ticket,
        }));

        // Insert tickets
        const { error: insertTicketsError } = await supabaseConnection
            .from('ticket')
            .insert(ticketsArray);

        if (insertTicketsError) {
            return {
                success: false,
                error: insertTicketsError,
                message: 'Error adding tickets',
                status: 500,
            };
        }

        return {
            success: true,
            data: {
                message: 'Tickets added',
                ticketsAdded: ticketsToSave.length,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error during tickets addition',
            status: 500,
        };
    }
};

/**
 * Adds a single ticket to a room
 * @param roomId - The room ID (numerical string like '1', '2', etc.)
 * @param ticketNumber - The ticket number to add
 * @returns Promise with ticket addition result
 */
export const addSingleTicketToRoom = async (
    roomId: string,
    ticketNumber: string
): Promise<ServiceResult> => {
    try {
        // Validate input
        if (!roomId || !ticketNumber) {
            return {
                success: false,
                error: 'Missing parameters',
                message: 'Room ID and ticket number are required',
                status: 400,
            };
        }

        // Find room
        const { data, error: findRoomError } = await supabaseConnection
            .from('room')
            .select()
            .eq('room_id', roomId);

        if (findRoomError) {
            return {
                success: false,
                error: findRoomError,
                message: 'Error fetching room',
                status: 500,
            };
        }

        if (data.length === 0) {
            return {
                success: false,
                error: 'Room not found',
                message: 'Room not found',
                status: 404,
            };
        }

        // Insert ticket
        const { data: insertedTicket, error: insertTicketError } =
            await supabaseConnection
                .from('ticket')
                .insert({
                    room_id: roomId,
                    ticket_number: ticketNumber,
                })
                .select();

        if (insertTicketError) {
            return {
                success: false,
                error: insertTicketError,
                message: 'Error adding ticket',
                status: 500,
            };
        }

        return {
            success: true,
            data: insertedTicket[0],
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error during ticket addition',
            status: 500,
        };
    }
};

/**
 * Gets detailed room information including tickets, users, and votes
 * @param roomId - The room ID (numerical string like '1', '2', etc.) to fetch
 * @returns Promise with room details result
 */
export const getRoomDetails = async (
    roomId: string
): Promise<RoomDetailsResult> => {
    try {
        // Validate input
        if (!roomId) {
            return {
                success: false,
                error: 'Missing room ID',
                message: 'Room ID is required',
                status: 400,
            };
        }

        // Get room data
        const { data: getRoomData, error: getRoomError } =
            await supabaseConnection
                .from('room')
                .select(
                    `
                    *,
                    ...user(
                      auth0_sub
                    )
                    `
                )
                .eq('room_id', roomId);

        if (getRoomError) {
            return {
                success: false,
                error: getRoomError,
                message: 'Error fetching room',
                status: 500,
            };
        }

        if (!getRoomData || getRoomData.length === 0) {
            return {
                success: false,
                error: 'Room not found',
                message: 'Room not found',
                status: 404,
            };
        }

        const roomData: RoomResponse = {
            adminSub: getRoomData[0].auth0_sub,
            createdAt: getRoomData[0].created_at,
            friendlyName: getRoomData[0].friendly_name,
            roomId: getRoomData[0].room_id,
            roomName: getRoomData[0].room_name,
            ticketBaseUrl: getRoomData[0].ticket_base_url,
        };

        // Get users in room
        const { data: userIdsInRoomData, error: userIdsInRoomError } =
            await supabaseConnection
                .from('room_users')
                .select(`user_id`)
                .eq('room_id', getRoomData[0].room_id);

        if (userIdsInRoomError) {
            return {
                success: false,
                error: userIdsInRoomError,
                message: 'Error fetching users',
                status: 500,
            };
        }

        const { data: usersInRoomData, error: usersInRoomError } =
            await supabaseConnection
                .from('user')
                .select()
                .in(
                    'user_id',
                    userIdsInRoomData.map((user) => user.user_id)
                );

        if (usersInRoomError) {
            return {
                success: false,
                error: usersInRoomError,
                message: 'Error fetching users',
                status: 500,
            };
        }

        // Get tickets
        const { data: ticketsData, error: ticketsError } =
            await supabaseConnection
                .from('ticket')
                .select()
                .order('ticket_number', { ascending: true })
                .eq('room_id', getRoomData[0].room_id);

        if (ticketsError) {
            return {
                success: false,
                error: ticketsError,
                message: 'Error fetching tickets',
                status: 500,
            };
        }

        // Get votes for each ticket
        const ticketsWithVotes: TicketWithVotes[] = [];
        for (const ticket of ticketsData) {
            const { data: votesData, error: votesError } =
                await supabaseConnection
                    .from('vote')
                    .select(
                        `
                          vote,
                          ...user(
                            usersub:auth0_sub
                          )
                          `
                    )
                    .eq('ticket_id', ticket.ticket_id);

            if (votesError) {
                return {
                    success: false,
                    error: votesError,
                    message: 'Error fetching votes',
                    status: 500,
                };
            }

            ticketsWithVotes.push({
                ...ticket,
                votes: votesData,
            });
        }

        return {
            success: true,
            data: {
                tickets: ticketsWithVotes,
                users: usersInRoomData,
                room: roomData,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error,
            message: 'Internal server error during room details fetch',
            status: 500,
        };
    }
};
