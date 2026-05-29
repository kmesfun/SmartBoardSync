const { query, pool } = require('../index');

const createColumn = async (boardId, name) => {
  // Use a transaction + row lock on the board to prevent TOCTOU races when
  // two concurrent requests both read MAX(position) and insert at the same value.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM boards WHERE id = $1 FOR UPDATE', [boardId]);
    const maxRes = await client.query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM columns WHERE board_id = $1',
      [boardId]
    );
    const position = parseFloat(maxRes.rows[0].max_pos) + 1;
    const result = await client.query(
      'INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3) RETURNING *',
      [boardId, name, position]
    );
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateColumn = (columnId, name) =>
  query('UPDATE columns SET name = $1 WHERE id = $2 RETURNING *', [name, columnId]);

const deleteColumn = (columnId) =>
  query('DELETE FROM columns WHERE id = $1', [columnId]);

const getColumnById = (columnId) =>
  query('SELECT * FROM columns WHERE id = $1', [columnId]);

module.exports = { createColumn, updateColumn, deleteColumn, getColumnById };
