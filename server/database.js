import { createPool } from 'mysql';
import { promisify } from 'util';
import camel from 'camelcase-keys';

const camelOptions = { deep: true };

const dbConfig = {
    connectionLimit: 10,
    host: 'localhost',
    user: 'insight_user',
    password: 'testPassword1',
    database: 'poker_planning',
    port: 3306,
};

const db = createPool(dbConfig);

db.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error(`Database connection was refused: ${dbConfig.host}`);
        }
    }
    if (connection) connection.release();
});

db.query = promisify(db.query);

db.asyncQuery = async (sql, values) =>
    new Promise((resolve, reject) => {
        db.query(sql, values, (error, results) => {
            if (error) reject(error);
            const formattedData = camel(results, camelOptions);
            resolve(formattedData);
        });
    });

db.asyncQuerySingleRecord = async (sql, values) =>
    new Promise((resolve, reject) => {
        db.query(sql, values, (error, results) => {
            if (error) reject(error);
            if (results === undefined || results.length === 0) {
                resolve(null);
            } else {
                const formattedData = camel(results[0], camelOptions);
                resolve(formattedData);
            }
        });
    });

export default db;
