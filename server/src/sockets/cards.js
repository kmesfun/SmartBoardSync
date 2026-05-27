const { lockCard, unlockCard, moveCard, getCardById, rebalanceColumn } = require('../db/queries/cards');
const { logActivity } = require('../db/queries/activity');

const registerCardHandlers = (io, socket) => {
  socket.on('card:lock', async ({ cardId }) => {
    try {
      const result = await lockCard(cardId, socket.userId);
      if (!result.rows[0]) {
        socket.emit('card:lock:rejected', { cardId });
        return;
      }
      const boardId = socket.currentBoard;
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

  socket.on('card:move', async ({ cardId, columnId, position, timestamp }) => {
    try {
      const card = await getCardById(cardId);
      if (!card.rows[0]) return;

      if (new Date(timestamp) < new Date(card.rows[0].updated_at)) {
        socket.emit('card:move:rejected', { cardId, currentState: card.rows[0] });
        return;
      }

      // Rebalance if position gap is too small
      const gap = position; // simplified check
      const result = await moveCard(cardId, columnId, position);
      if (!result.rows[0]) return;

      const boardId = socket.currentBoard;
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
