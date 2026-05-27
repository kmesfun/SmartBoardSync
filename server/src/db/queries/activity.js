const { query } = require('../index');

const logActivity = (boardId, userId, action, payload = {}) =>
  query(
    'INSERT INTO activity_log (board_id, user_id, action, payload) VALUES ($1, $2, $3, $4)',
    [boardId, userId, action, JSON.stringify(payload)]
  );

const getActivity = (boardId, limit = 20, offset = 0) =>
  query(
    `SELECT al.*, u.name AS user_name FROM activity_log al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.board_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2 OFFSET $3`,
    [boardId, limit, offset]
  );

module.exports = { logActivity, getActivity };
