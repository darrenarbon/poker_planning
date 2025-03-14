/* eslint-disable no-undef */
import { v4 as uuidv4 } from 'uuid';
import { Router } from 'express';
import { supabaseConnection } from './database.js';
import { auth } from 'express-oauth2-jwt-bearer';

const checkJwt = auth({
    audience: process.env.LOCAL_URL,
    issuerBaseURL: `https://dev-1jevct6pshmx18pw.uk.auth0.com/`,
});

const getUserDetails = async (sub) => {
    const { data, error } = await supabaseConnection
        .from('user')
        .select()
        .eq('auth0_sub', sub);

    if (error) {
        console.error(error);
        throw error;
    }

    return data[0];
};

export const returnError = (res, code, error, message) => {
    console.error(error);
    console.error(message);
    return res.status(code).json({ error: message });
};

const router = Router();

// router.all('/*', (req, res, next) => {
//     res.header('Access-Control-Allow-Origin', process.env.FRONT_END_URL);
//     res.header(
//         'Access-Control-Allow-Headers',
//         'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
//     );
//     res.header('Access-Control-Allow-Credentials', true);
//     res.header(
//         'Access-Control-Allow-Methods',
//         'GET,PUT,POST,DELETE,UPDATE,OPTIONS'
//     );
//     if (req.method === 'OPTIONS') {
//         res.header(
//             'Access-Control-Allow-Headers',
//             'Origin, X-Requested-With, Content-Type, Accept, Authorization'
//         );
//         res.header(
//             'Access-Control-Allow-Methods',
//             'GET, POST, PUT, DELETE, PATCH'
//         );
//         return res.status(200).json({});
//     }
//     return next();
// });

router.post('/login', async (req, res) => {
    const { user } = req.body;
    const { sub, email, given_name, family_name, nickname, picture } = user;

    const userInDB = await getUserDetails(sub);

    if (userInDB) {
        return res.status(200).json({});
    }

    const { error } = await supabaseConnection.from('user').insert({
        auth0_sub: sub,
        email,
        given_name,
        family_name,
        nickname,
        picture,
    });

    if (error) {
        return returnError(res, 500, error, 'Error creating user');
    }
    return res.status(200).json({});
});

router.post('/newroom', checkJwt, async (req, res) => {
    const authPayload = req.auth.payload;
    const userInDB = await getUserDetails(authPayload);

    const roomName = uuidv4().substring(0, 10);

    const { data, error: createRoomError } = await supabaseConnection
        .from('room')
        .insert([{ room_name: roomName, admin_id: userInDB.user_id }])
        .select();

    if (createRoomError) {
        return returnError(res, 500, createRoomError, 'Error creating room');
    }

    const { error: addUsertoRoomError } = await supabaseConnection
        .from('room_users')
        .insert([{ room_id: data[0].room_id, user_id: userInDB.user_id }]);

    if (addUsertoRoomError) {
        return returnError(
            res,
            500,
            addUsertoRoomError,
            'Error adding user to room'
        );
    }

    return res.json({ roomId: roomName });
});

router.post('/room/:roomId/tickets', async (req, res) => {
    const { roomId } = req.params;
    const { ticketsToSave, baseUrl } = req.body;

    const { data, error: findRoomError } = await supabaseConnection
        .from('room')
        .select()
        .eq('room_name', roomId);

    if (findRoomError) {
        return returnError(res, 500, findRoomError, 'Error fetching room');
    }

    if (data.length === 0) {
        return returnError(res, 404, null, 'Room not found');
    }

    const ticketsArray = ticketsToSave.map((ticket) => {
        return {
            room_id: data[0].room_id,
            ticket_number: ticket,
            ticket_url: `${baseUrl}/${ticket}`,
        };
    });

    const { error: insertTicketsError } = await supabaseConnection
        .from('ticket')
        .insert(ticketsArray);
    if (insertTicketsError) {
        return returnError(
            res,
            500,
            insertTicketsError,
            'Error adding tickets'
        );
    }

    return res.json({ message: 'Tickets added' });
});

router.get('/room/:roomName', async (req, res) => {
    const { roomName } = req.params;

    const { data: getRoomData, error: getRoomError } = await supabaseConnection
        .from('room')
        .select(
            `
    *,
    ...user(
      auth0_sub
    )
    `
        )
        .eq('room_name', roomName);

    if (getRoomError) {
        return returnError(res, 500, getRoomError, 'Error fetching room');
    }

    const { data: userIdsInRoomData, error: userIdsInRoomError } =
        await supabaseConnection
            .from('room_users')
            .select(`user_id`)
            .eq('room_id', getRoomData[0].room_id);

    if (userIdsInRoomError) {
        return returnError(
            res,
            500,
            userIdsInRoomError,
            'Error fetching users'
        );
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
        return returnError(res, 500, usersInRoomError, 'Error fetching users');
    }

    const { data: ticketsData, error: ticketsError } = await supabaseConnection
        .from('ticket')
        .select()
        .eq('room_id', getRoomData[0].room_id);

    if (ticketsError) {
        return returnError(res, 500, ticketsError, 'Error fetching tickets');
    }

    const ticketsWithVotes = [];
    for (const ticket of ticketsData) {
        const { data: votesData, error: votesError } = await supabaseConnection
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
            return returnError(res, 500, votesError, 'Error fetching votes');
        }

        ticketsWithVotes.push({
            ...ticket,
            votes: votesData,
        });
    }

    res.json({
        tickets: ticketsWithVotes,
        users: usersInRoomData,
        adminId: getRoomData[0].auth0_sub,
    });
});

router.get('*', (req, res) => {
    res.send('Sorry, page not found... What are you doing with your life?');
});

export default router;
