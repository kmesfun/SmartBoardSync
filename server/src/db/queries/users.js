const { query } = require('../index');

const createUser = (email, hashedPassword, name) =>
  query(
    'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
    [email, hashedPassword, name]
  );

const getUserByEmail = (email) =>
  query('SELECT * FROM users WHERE email = $1', [email]);

const getUserById = (id) =>
  query('SELECT id, email, name, created_at FROM users WHERE id = $1', [id]);

module.exports = { createUser, getUserByEmail, getUserById };
