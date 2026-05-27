const { query } = require('../index');

const createColumn = async (boardId, name) => {
  const maxRes = await query(
    'SELECT COALESCE(MAX(position), 0) AS max_pos FROM columns WHERE board_id = $1',
    [boardId]
  );
  const position = parseFloat(maxRes.rows[0].max_pos) + 1;
  return query(
    'INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3) RETURNING *',
    [boardId, name, position]
  );
};

const updateColumn = (columnId, name) =>
  query('UPDATE columns SET name = $1 WHERE id = $2 RETURNING *', [name, columnId]);

const deleteColumn = (columnId) =>
  query('DELETE FROM columns WHERE id = $1', [columnId]);

const getColumnById = (columnId) =>
  query('SELECT * FROM columns WHERE id = $1', [columnId]);

module.exports = { createColumn, updateColumn, deleteColumn, getColumnById };
