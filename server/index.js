import express, { json } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import db from './database.js';

import router from './routes.js';

const app = express();

const server = createServer(app);

const localhost = 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: localhost,
    methods: ['GET', 'POST'],
  },
});

const corsOptions = {
  origin: localhost,
  credentials: true,
};
app.use(cors(corsOptions));

app.use(json());

app.use('/', router);

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', async ({ roomName, userSub }) => {
    if (userSub) {
      console.log('join', roomName, userSub);
      socket.join(roomName);

      const room = await db.asyncQuerySingleRecord(
        'SELECT * FROM room WHERE room_name = ?;',
        [roomName]
      );

      const user = await db.asyncQuerySingleRecord(
        'SELECT * FROM user WHERE auth0_sub = ?;',
        [userSub]
      );

      const userInRoom = await db.asyncQuerySingleRecord(
        'SELECT * FROM room_users WHERE room_id = ? AND user_id = ?;',
        [room.roomId, user.userId]
      );

      if (!userInRoom) {
        await db.asyncQuery(
          'INSERT INTO room_users (room_id, user_id) VALUES (?, ?);',
          [room.roomId, user.userId]
        );
      }

      const users = await db.asyncQuery(
        `SELECT u.auth0_sub as sub, u.given_name, u.family_name, u.nickname
        FROM room_users ru 
        LEFT JOIN user u ON ru.user_id = u.user_id
        WHERE ru.room_id = ?;`,
        [room.roomId]
      );

      socket.to(roomName).emit('userJoined', { users: users });
    }
  });

  socket.on('vote', async ({ roomName, ticketId, vote, userSub }) => {
    console.log('vote', roomName, ticketId, vote, userSub);

    const user = await db.asyncQuerySingleRecord(
      'SELECT * FROM user WHERE auth0_sub = ?;',
      [userSub]
    );

    if (vote) {
      const existingVote = await db.asyncQuerySingleRecord(
        'SELECT * FROM vote WHERE ticket_id = ? AND user_id = ?;',
        [ticketId, user.userId]
      );
      if (existingVote) {
        await db.asyncQuery('UPDATE vote SET vote = ? WHERE vote_id = ?;', [
          vote,
          existingVote.voteId,
        ]);
      } else {
        await db.asyncQuery(
          'INSERT INTO vote (ticket_id, vote, user_id) VALUES (?, ?, ?);',
          [ticketId, vote, user.userId]
        );
      }
      socket.to(roomName).emit('voteReceived', { ticketId, vote, userSub });
    } else {
      socket.emit('error', 'Error adding vote');
    }
  });

  socket.on('showVotes', async ({ roomName, ticketId }) => {
    console.log('showVotes', roomName, ticketId);

    const currentTicket = await db.asyncQuerySingleRecord(
      'SELECT * FROM ticket WHERE ticket_id = ?;',
      [ticketId]
    );

    if (!currentTicket) {
      console.log('invalid ticket');
      socket.emit('error', 'Invalid ticket');
      return;
    }

    const ticketInRoom = await db.asyncQuerySingleRecord(
      'SELECT * FROM ticket t LEFT JOIN room r ON r.room_id = t.room_id WHERE t.ticket_id = ? AND r.room_name = ?;',
      [ticketId, roomName]
    );

    if (!ticketInRoom) {
      console.log('invalid ticket');
      socket.emit('error', 'Invalid ticket');
      return;
    }

    io.in(roomName).emit('showVotes', {
      ticketId,
    });
  });

  socket.on('setEstimate', async ({ roomName, currentTicket }) => {
    const { ticketId, chosenEstimate, averageVote, standardDeviation } =
      currentTicket;

    console.log(ticketId, chosenEstimate, averageVote, standardDeviation);

    const room = await db.asyncQuerySingleRecord(
      'SELECT * FROM room WHERE room_name = ?;',
      [roomName]
    );

    if (room) {
      const updatedTicket = await db.asyncQuery(
        'UPDATE ticket SET chosen_estimate = ?, average_vote = ?, standard_deviation = ? WHERE ticket_id = ?;',
        [chosenEstimate, averageVote, standardDeviation, ticketId]
      );

      if (updatedTicket) {
        console.log('ticket updated');
        socket.to(roomName).emit('showEstimate', { currentTicket });
      } else {
        console.log('Could not update ticket');
        socket.emit('error', 'Could not update ticket');
        return;
      }
    } else {
      console.log('Could not find room');
      socket.emit('error', 'Could not find room');
      return;
    }
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
