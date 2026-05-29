const { lockCard, unlockCard, moveCard, getCardById, rebalanceColumn } = require('../db/queries/cards');
const { isBoardMember } = require('../db/queries/boards');
const { logActivity } = require('../db/queries/activity');
const { query } = require('../db');

const MIN_POSITION_GAP = 0.001;

async function needsRebalance(columnId) {
  const res = await query(
    'SELECT position FROM cards WHERE column_id = $1 ORDER BY position',
    [columnId]
  );
  if (res.rows.length <= 1) return false;
  for (let i = 1; i < res.rows.length; i++) {
    if (res.rows[i].position - res.rows[i - 1].position < MIN_POSITION_GAP) return true;
  }
  return false;
}

const registerCardHandlers = (io, socket) => {
  socket.on('card:lock', async ({ cardId }) => {
    try {
      const boardId = socket.currentBoard;
      if (!boardId) return;
      const membership = await isBoardMember(boardId, socket.userId);
      if (!membership.rows[0]) {
        socket.emit('card:lock:rejected', { cardId });
        return;
      }
      const result = await lockCard(cardId, socket.userId);
      if (!result.rows[0]) {
        socket.emit('card:lock:rejected', { cardId });
        return;
      }
      io.to(boardId).emit('card:locked', {
        cardId,
        lockedBy: { id: socket.userId, name: socket.userName },
      });
    } catch (err) {
      socket.emit('card:lock:rejected', { cardId });
    }
  });

  socket.on('card:unlock', async ({ cardId }) => {
    try {
      await unlockCard(cardId, socket.userId);
      const boardId = socket.currentBoard;
      io.to(boardId).emit('card:unlocked', { cardId });
    } catch (err) {
      // silent
    }
  });

  // clientUpdatedAt: the `updated_at` timestamp the client last saw for this card.
  // Reject the move if the DB has a newer update (another user already moved it).
  socket.on('card:move', async ({ cardId, columnId, position, clientUpdatedAt }) => {
    try {
      const boardId = socket.currentBoard;
      if (!boardId) return;

      const membership = await isBoardMember(boardId, socket.userId);
      if (!membership.rows[0]) {
        socket.emit('card:move:rejected', { cardId, error: 'Forbidden' });
        return;
      }

      const card = await getCardById(cardId);
      if (!card.rows[0]) return;

      // Conflict check: reject if another user updated the card more recently
      if (clientUpdatedAt && new Date(clientUpdatedAt) < new Date(card.rows[0].updated_at)) {
        socket.emit('card:move:rejected', { cardId, currentState: card.rows[0] });
        return;
      }

      const result = await moveCard(cardId, columnId, position);
      if (!result.rows[0]) return;

      // Rebalance float positions if gap has shrunk below threshold
      if (await needsRebalance(columnId)) {
        await rebalanceColumn(columnId);
      }

      io.to(boardId).emit('card:moved', { cardId, columnId, position });

      logActivity(boardId, socket.userId, 'card:move', {
        cardId,
        columnId,
        cardTitle: result.rows[0].title,
      }).catch(() => {});
    } catch (err) {
      socket.emit('card:move:rejected', { cardId, error: err.message });
    }
  });
};

module.exports = { registerCardHandlers };
