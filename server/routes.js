import { v4 as uuidv4 } from 'uuid';
import { Router } from 'express';
import db from './database.js';
import { auth } from 'express-oauth2-jwt-bearer';

const checkJwt = auth({
  audience: 'http://localhost:3000',
  issuerBaseURL: `https://dev-1jevct6pshmx18pw.uk.auth0.com/`,
});

const getUserDetails = async (sub) => {
  const user = await db.asyncQuerySingleRecord(
    'SELECT * FROM user WHERE auth0_sub = ?;',
    [sub]
  );
  return user;
};

const router = Router();

router.all('/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
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
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  return next();
});

router.post('/login', checkJwt, async (req, res) => {
  const { user } = req.body;

  const userInDB = await getUserDetails(user.sub);
  if (userInDB) {
    return res.status(200);
  }

  try {
    const newUser = await db.asyncQuery(
      'INSERT INTO user (auth0_sub, email, given_name, family_name, nickname, picture) VALUES (?, ?, ?, ?, ?, ?);',
      [
        user.sub,
        user.email,
        user.given_name,
        user.family_name,
        user.nickname,
        user.picture,
      ]
    );
    if (newUser) {
      return res.status(200);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error creating user' });
  }
});

router.post('/newroom', checkJwt, async (req, res) => {
  const authPayload = req.auth.payload;
  const userInDB = await getUserDetails(authPayload.sub);

  const roomName = uuidv4().substring(0, 10);
  const room = await db.asyncQuery(
    'INSERT INTO room (room_name, admin_id) VALUES (?, ?);',
    [roomName, userInDB.userId]
  );

  if (room.insertId) {
    await db.asyncQuery(
      'INSERT INTO room_users (room_id, user_id) VALUES (?, ?);',
      [room.insertId, userInDB.userId]
    );
    res.json({ roomId: roomName });
  } else {
    res.status(500).json({ error: 'Error creating room' });
  }
});

router.post('/room/:roomId/tickets', async (req, res) => {
  const { roomId } = req.params;
  const { ticketsToSave, baseUrl } = req.body;

  const ticketsArray = ticketsToSave.map((ticket) => {
    return {
      ticket_number: ticket,
      ticket_url: `${baseUrl}/${ticket}`,
    };
  });

  const room = await db.asyncQuerySingleRecord(
    'SELECT * FROM room WHERE room_name = ?;',
    [roomId]
  );

  if (room) {
    const ticketsAdded = await db.asyncQuery(
      'INSERT INTO ticket (room_id, ticket_number, ticket_url) VALUES ?;',
      [
        ticketsArray.map((ticket) => [
          room.roomId,
          ticket.ticket_number,
          ticket.ticket_url,
        ]),
      ]
    );

    if (ticketsAdded) {
      res.json({ message: 'Tickets added' });
    } else {
      res.status(500).json({ error: 'Error adding tickets' });
    }
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

router.get('/room/:roomName', async (req, res) => {
  const { roomName } = req.params;

  const room = await db.asyncQuerySingleRecord(
    'SELECT r.*, u.auth0_sub FROM room r LEFT JOIN user u on u.user_id = r.admin_id WHERE room_name = ?;',
    [roomName]
  );

  const adminId = room.auth0Sub;

  const usersInRoom = await db.asyncQuery(
    `SELECT u.auth0_sub as sub, u.given_name, u.family_name, u.nickname, u.picture
    FROM user u
    LEFT JOIN room_users ru ON u.user_id = ru.user_id
    WHERE ru.room_id = ?;`,
    [room.roomId]
  );

  const tickets = await db.asyncQuery(
    `SELECT *
    FROM ticket
    WHERE room_id = ?;`,
    [room.roomId]
  );

  if (tickets) {
    const ticketsWithVotes = [];
    for (const ticket of tickets) {
      const votes = await db.asyncQuery(
        `SELECT v.vote, u.auth0_sub as userSub
        FROM vote v
        LEFT JOIN user u ON v.user_id = u.user_id
        WHERE ticket_id = ?;`,
        [ticket.ticketId]
      );
      ticketsWithVotes.push({
        ...ticket,
        votes,
      });
    }

    res.json({ tickets: ticketsWithVotes, users: usersInRoom, adminId });
  } else {
    res.status(500).json({ error: 'Error fetching tickets' });
  }
});

router.get('*', (req, res) => {
  res.send('Sorry, page not found... What are you doing with your life?');
});

export default router;
