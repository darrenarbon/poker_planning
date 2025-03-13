import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import connection from './database.js';

const { compare } = bcrypt;
const { serializeUser, deserializeUser, use } = passport;

// tell passport how to serialize the user
serializeUser((user, done) => {
  done(null, user.userId);
});

deserializeUser(async (id, done) => {
  try {
    const user = await connection.queryAsync(
      'SELECT * FROM `user` WHERE user_id = ?;',
      [id]
    );
    if (user[0]) {
      // user exists and credentials are fine
      return done(null, user);
    }
    // user does not exist
    return done(null, false);
  } catch (err) {
    console.error(
      `Error while performing Query (passport.deserialize). ${err.message}`
    );
    return done(err, false);
  }
});

// configure passport.js to use the local strategy
use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await connection.singleQuery(
        'SELECT * FROM `user` WHERE email = ?;',
        [username]
      );
      if (user) {
        // user exists and credentials are fine
        compare(password, user.password, (err, isMatch) => {
          if (!isMatch) {
            // password incorrect
            return done(null, false, { message: 'Invalid credentials' });
          }
          return done(null, user);
        });
      } else {
        // user does not exist
        return done(null, false, { message: 'Invalid credentials' });
      }
    } catch (err) {
      console.error(`Error while performing Query (passport.use). ${err}`);
      return done(null, false, { message: 'Invalid credentials' });
    }
    return null;
  })
);

export default passport;
