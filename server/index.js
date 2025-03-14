/* eslint-disable no-undef */
import express, { json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import 'dotenv/config';

import router from './routes.js';
import { supabaseConnection } from './database.js';

process.on('uncaughtException', function (error) {
    console.log(error.stack);
});

const app = express();

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const corsOptions = {
    origin: process.env.FRONT_END_URL,
    credentials: true,
    methods: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(json());

app.use('/', router);

const emitError = (socket, error, message) => {
    console.error(error);
    console.error(message);
    socket.emit('error', message);
};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join', async ({ roomName, userSub }) => {
        if (userSub) {
            console.log('join', roomName, userSub);
            socket.join(roomName);

            const { data: roomData, error: roomError } =
                await supabaseConnection
                    .from('room')
                    .select()
                    .eq('room_name', roomName);

            if (roomError) {
                return emitError(socket, error, 'Error getting room');
            }

            const { data: userData, error: userError } =
                await supabaseConnection
                    .from('user')
                    .select()
                    .eq('auth0_sub', userSub);

            if (userError) {
                return emitError(socket, userError, 'Error getting user');
            }

            const { data: userInRoomData, error: userInRoomError } =
                await supabaseConnection
                    .from('room_users')
                    .select()
                    .eq('room_id', roomData[0].room_id)
                    .eq('user_id', userData[0].user_id);

            if (userInRoomError) {
                return emitError(
                    socket,
                    userInRoomError,
                    'Error getting user in room'
                );
            }

            if (userInRoomData.length === 0) {
                const { error: insertUserInRoomError } =
                    await supabaseConnection.from('room_users').insert({
                        room_id: roomData[0].room_id,
                        user_id: userData[0].user_id,
                    });

                if (insertUserInRoomError) {
                    return emitError(
                        socket,
                        insertUserInRoomError,
                        'Error adding user to room'
                    );
                }
            }

            const { data: usersInRoomData, error: usersInRoomError } =
                await supabaseConnection
                    .from('room_users')
                    .select(
                        `
            *,
            user:user_id(*)
            `
                    )
                    .eq('room_id', roomData[0].room_id);

            const users = usersInRoomData.map((user) => {
                return {
                    user_id: user.user_id,
                    ...user.user,
                };
            });

            if (usersInRoomError) {
                return emitError(
                    socket,
                    usersInRoomError,
                    'Error getting users in room'
                );
            }

            socket.to(roomName).emit('userJoined', { users });
        }
    });

    socket.on('vote', async ({ roomName, ticketId, vote, userSub }) => {
        console.log('vote', roomName, ticketId, vote, userSub);

        const { data: userData, error: userError } = await supabaseConnection
            .from('user')
            .select()
            .eq('auth0_sub', userSub);

        if (userError) {
            return emitError(socket, userError, 'Error getting user');
        }

        if (vote) {
            const { data: existingVoteData, error: existingVoteError } =
                await supabaseConnection
                    .from('vote')
                    .select()
                    .eq('ticket_id', ticketId)
                    .eq('user_id', userData[0].user_id);

            if (existingVoteError) {
                return emitError(
                    socket,
                    existingVoteError,
                    'Error getting existing vote'
                );
            }

            if (existingVoteData.length > 0) {
                const { error: updateVoteError } = await supabaseConnection
                    .from('vote')
                    .update({ vote })
                    .eq('vote_id', existingVoteData[0].vote_id);

                if (updateVoteError) {
                    return emitError(
                        socket,
                        updateVoteError,
                        'Error updating vote'
                    );
                }
            } else {
                const { error: insertVoteError } = await supabaseConnection
                    .from('vote')
                    .insert({
                        ticket_id: ticketId,
                        vote,
                        user_id: userData[0].user_id,
                    });

                if (insertVoteError) {
                    return emitError(
                        socket,
                        insertVoteError,
                        'Error inserting vote'
                    );
                }
            }
            socket
                .to(roomName)
                .emit('voteReceived', { ticketId, vote, userSub });
        } else {
            socket.emit('error', 'No vote was submitted');
        }
    });

    socket.on('showVotes', async ({ roomName, ticketId }) => {
        console.log('showVotes', roomName, ticketId);

        const { data: currentTicketData, error: currentTicketError } =
            await supabaseConnection
                .from('ticket')
                .select()
                .eq('ticket_id', ticketId);

        if (currentTicketError) {
            return emitError(
                socket,
                currentTicketError,
                'Error getting ticket'
            );
        }
        if (currentTicketData.length === 0) {
            return emitError(socket, null, 'Ticket not found');
        }

        const { data: getTicketData, error: getTicketError } =
            await supabaseConnection
                .from('room')
                .select()
                .eq('room_id', currentTicketData[0].room_id)
                .eq('room_name', roomName);

        if (getTicketError) {
            return emitError(socket, getTicketError, 'Error getting ticket');
        }

        if (getTicketData.length === 0) {
            return emitError(socket, null, 'Ticket not found');
        }

        io.in(roomName).emit('showVotes', {
            ticketId,
        });
    });

    socket.on('setEstimate', async ({ roomName, currentTicket }) => {
        const { ticketId, chosenEstimate, averageVote, standardDeviation } =
            currentTicket;

        console.log(ticketId, chosenEstimate, averageVote, standardDeviation);

        const { data: roomData, error: roomError } = await supabaseConnection
            .from('room')
            .select()
            .eq('room_name', roomName);

        if (roomError) {
            return emitError(socket, roomError, 'Error getting room');
        }

        if (roomData.length > 0) {
            const { error: updateTicketError } = await supabaseConnection
                .from('ticket')
                .update({
                    chosen_estimate: chosenEstimate,
                    average_vote: averageVote,
                    standard_deviation: standardDeviation,
                })
                .eq('ticket_id', ticketId);

            if (updateTicketError) {
                return emitError(
                    socket,
                    updateTicketError,
                    'Error updating ticket'
                );
            }
            console.log('ticket updated');
            socket.to(roomName).emit('showEstimate', { currentTicket });
        } else {
            return emitError(socket, roomError, 'Could not find room');
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
