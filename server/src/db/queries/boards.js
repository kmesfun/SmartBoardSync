const { query, pool } = require('../index');

const getBoardsByUser = (userId) =>
  query(
    `SELECT b.* FROM boards b
     JOIN board_members bm ON b.id = bm.board_id
     WHERE bm.user_id = $1
     ORDER BY b.created_at DESC`,
    [userId]
  );

const createBoard = async (name, ownerId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO boards (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, ownerId]
    );
    const board = result.rows[0];
    await client.query(
      'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
      [board.id, ownerId, 'owner']
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

const getBoardById = (boardId) =>
  query('SELECT * FROM boards WHERE id = $1', [boardId]);

const getBoardWithColumns = async (boardId) => {
  const colResult = await query(
    `SELECT c.*, json_agg(
       json_build_object(
         'id', ca.id,
         'title', ca.title,
         'description', ca.description,
         'position', ca.position,
         'points', ca.points,
         'locked_by', ca.locked_by,
         'locked_at', ca.locked_at,
         'column_id', ca.column_id,
         'updated_at', ca.updated_at,
         'created_at', ca.created_at
       ) ORDER BY ca.position
     ) FILTER (WHERE ca.id IS NOT NULL) AS cards
     FROM columns c
     LEFT JOIN cards ca ON ca.column_id = c.id
     WHERE c.board_id = $1
     GROUP BY c.id
     ORDER BY c.position`,
    [boardId]
  );
  return colResult.rows;
};

const deleteBoard = (boardId) =>
  query('DELETE FROM boards WHERE id = $1', [boardId]);

const isBoardMember = (boardId, userId) =>
  query('SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2', [boardId, userId]);

module.exports = { getBoardsByUser, createBoard, getBoardById, getBoardWithColumns, deleteBoard, isBoardMember };
