const { query } = require('../index');

const createCard = async (columnId, title, explicitPosition = null) => {
  let position = explicitPosition;
  if (position === null) {
    const maxRes = await query(
      'SELECT COALESCE(MAX(position), 0) AS max_pos FROM cards WHERE column_id = $1',
      [columnId]
    );
    position = parseFloat(maxRes.rows[0].max_pos) + 1;
  }
  return query(
    'INSERT INTO cards (column_id, title, position) VALUES ($1, $2, $3) RETURNING *',
    [columnId, title, position]
  );
};

const updateCard = (cardId, fields) => {
  const allowed = ['title', 'description', 'points'];
  const sets = [];
  const vals = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in fields) {
      sets.push(`${key} = $${idx++}`);
      vals.push(fields[key]);
    }
  }
  if (!sets.length) return Promise.resolve({ rows: [] });
  sets.push(`updated_at = NOW()`);
  vals.push(cardId);
  return query(
    `UPDATE cards SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    vals
  );
};

const moveCard = (cardId, columnId, position) =>
  query(
    'UPDATE cards SET column_id = $2, position = $3, updated_at = NOW() WHERE id = $1 RETURNING *',
    [cardId, columnId, position]
  );

const deleteCard = (cardId) =>
  query('DELETE FROM cards WHERE id = $1', [cardId]);

const getCardById = (cardId) =>
  query('SELECT * FROM cards WHERE id = $1', [cardId]);

const lockCard = (cardId, userId) =>
  query(
    'UPDATE cards SET locked_by = $1, locked_at = NOW() WHERE id = $2 AND locked_by IS NULL RETURNING *',
    [userId, cardId]
  );

const unlockCard = (cardId, userId) =>
  query(
    'UPDATE cards SET locked_by = NULL, locked_at = NULL WHERE id = $1 AND locked_by = $2 RETURNING *',
    [cardId, userId]
  );

const releaseAllLocksByUser = (userId) =>
  query(
    'UPDATE cards SET locked_by = NULL, locked_at = NULL WHERE locked_by = $1 RETURNING *',
    [userId]
  );

const rebalanceColumn = async (columnId) => {
  const res = await query(
    'SELECT id FROM cards WHERE column_id = $1 ORDER BY position',
    [columnId]
  );
  const updates = res.rows.map((row, i) =>
    query('UPDATE cards SET position = $1 WHERE id = $2', [i + 1, row.id])
  );
  await Promise.all(updates);
};

const getCardsByBoard = async (boardId) =>
  query(
    `SELECT ca.* FROM cards ca
     JOIN columns c ON ca.column_id = c.id
     WHERE c.board_id = $1`,
    [boardId]
  );

module.exports = {
  createCard, updateCard, moveCard, deleteCard, getCardById,
  lockCard, unlockCard, releaseAllLocksByUser, rebalanceColumn, getCardsByBoard,
};
