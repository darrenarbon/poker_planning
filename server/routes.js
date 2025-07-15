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

    console.log('User details fetched:', data[0]);

    return data[0];
};

export const returnError = (res, code, error, message) => {
    console.error(error);
    console.error(message);
    return res.status(code).json({ error: message });
};

const router = Router();

router.all('/*', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Allow-Credentials', true);
    res.header(
        'Access-Control-Allow-Methods',
        'GET,PUT,POST,DELETE,UPDATE,OPTIONS'
    );
    if (req.method === 'OPTIONS') {
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        );
        res.header(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, PATCH'
        );
        return res.status(200).json({});
    }
    return next();
});

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
    try {
        const { roomName, baseUrl } = req.body;
        const authPayload = req.auth.payload;
        const userInDB = await getUserDetails(authPayload.sub);

        const roomUUID = uuidv4().substring(0, 10);

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
            return returnError(
                res,
                500,
                createRoomError,
                'Error creating room'
            );
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

        return res.json({ roomId: roomUUID });
    } catch (error) {
        console.error('Error in /newroom:', error);
        return returnError(res, 500, error, 'Internal server error');
    }
});

router.delete('/ticket/:ticketId', checkJwt, async (req, res) => {
    const { ticketId } = req.params;

    const { data, error: findTicketError } = await supabaseConnection
        .from('ticket')
        .select()
        .eq('ticket_id', ticketId);

    if (findTicketError) {
        return returnError(res, 500, findTicketError, 'Error fetching ticket');
    }

    if (data.length === 0) {
        return returnError(res, 404, null, 'Ticket not found');
    }

    const { error: deleteTicketError } = await supabaseConnection
        .from('ticket')
        .delete()
        .eq('ticket_id', ticketId);

    if (deleteTicketError) {
        return returnError(
            res,
            500,
            deleteTicketError,
            'Error deleting ticket'
        );
    }

    return res.json({ message: 'Ticket deleted' });
});

router.post('/room/:roomId/tickets', checkJwt, async (req, res) => {
    const { roomId } = req.params;
    const { ticketsToSave } = req.body;

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

router.post('/room/:roomName/newTicket', checkJwt, async (req, res) => {
    const { roomName } = req.params;
    const { ticketNumber } = req.body;
    const { data, error: findRoomError } = await supabaseConnection
        .from('room')
        .select()
        .eq('room_name', roomName);

    if (findRoomError) {
        return returnError(res, 500, findRoomError, 'Error fetching room');
    }

    if (data.length === 0) {
        return returnError(res, 404, null, 'Room not found');
    }

    const { data: insertedTicket, error: insertTicketError } =
        await supabaseConnection
            .from('ticket')
            .insert({
                room_id: data[0].room_id,
                ticket_number: ticketNumber,
            })
            .select();

    if (insertTicketError) {
        return returnError(res, 500, insertTicketError, 'Error adding ticket');
    }
    return res.json({ ...insertedTicket[0] });
});

router.get('/users/:userSub/rooms', checkJwt, async (req, res) => {
    const { userSub } = req.params;
    const { user_id } = await getUserDetails(userSub);

    const { data, error: findRoomsError } = await supabaseConnection
        .from('room')
        .select()
        .eq('admin_id', user_id)
        .order('created_at', { ascending: false });

    if (findRoomsError) {
        return returnError(
            res,
            500,
            findRoomsError,
            'Error fetching rooms for user'
        );
    }

    return res.json({ rooms: data });
});

router.get('/room/:roomName', checkJwt, async (req, res) => {
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

    const roomData = {
        adminSub: getRoomData[0].auth0_sub,
        createdAt: getRoomData[0].created_at,
        friendlyName: getRoomData[0].friendly_name,
        roomId: getRoomData[0].room_id,
        roomName: getRoomData[0].room_name,
        ticketBaseUrl: getRoomData[0].ticket_base_url,
    };

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
        .order('ticket_number', { ascending: true })
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
        room: roomData,
    });
});

router.get('/jiraticket/:ticketId', checkJwt, async (req, res) => {
    const { ticketId } = req.params;

    const response = await fetch(
        `https://${process.env.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/issue/${ticketId}?fields=description,summary,creator,parent,priority&expand=renderedFields`,
        {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.ATLASSIAN_EMAIL}:${process.env.ATLASSIAN_API_KEY}`
                ).toString('base64')}`,
                Accept: 'application/json',
            },
        }
    );
    const data = await response.json();
    if (!response.ok) {
        return returnError(
            res,
            response.status,
            data,
            'Error fetching JIRA ticket'
        );
    }
    return res.json(data);
});

router.post('/jiraticket/:ticketId', async (req, res) => {
    const { ticketId } = req.params;
    const { storyPoints } = req.body;

    const response = await fetch(
        `https://${process.env.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/issue/${ticketId}?overrideScreenSecurity=true`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.ATLASSIAN_EMAIL}:${process.env.ATLASSIAN_API_KEY}`
                ).toString('base64')}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    customfield_10024: storyPoints,
                },
            }),
        }
    );
    const data = await response.text();
    if (!response.ok) {
        return returnError(
            res,
            response.status,
            data,
            'Error fetching JIRA ticket'
        );
    }
    return res.json(data);
});

router.post('/jiraticket/alltickets', async (req, res) => {
    const response = await fetch(
        `https://${process.env.ATLASSIAN_DOMAIN}.atlassian.net/rest/api/3/search?jql=labels=Needs-estimating`,
        {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.ATLASSIAN_EMAIL}:${process.env.ATLASSIAN_API_KEY}`
                ).toString('base64')}`,
                Accept: 'application/json',
            },
        }
    );
    const data = await response.json();
    if (!response.ok) {
        return returnError(
            res,
            response.status,
            data,
            'Error fetching JIRA ticket'
        );
    }
    return res.json(data);
});

router.get('*', (req, res) => {
    res.send('Sorry, page not found... What are you doing with your life?');
});

export default router;
