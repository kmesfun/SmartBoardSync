const { releaseAllLocksByUser } = require('../db/queries/cards');

const roomUsers = new Map(); // boardId -> Map<socketId, {id, name}>

const registerPresenceHandlers = (io, socket) => {
  socket.on('presence:join', ({ boardId }) => {
    socket.join(boardId);
    socket.currentBoard = boardId;

    if (!roomUsers.has(boardId)) roomUsers.set(boardId, new Map());
    roomUsers.get(boardId).set(socket.id, { id: socket.userId, name: socket.userName });

    const activeUsers = [...roomUsers.get(boardId).values()];
    io.to(boardId).emit('presence:update', { activeUsers });
  });

  socket.on('disconnect', async () => {
    try {
      const released = await releaseAllLocksByUser(socket.userId);
      const boardId = socket.currentBoard;

      if (boardId) {
        for (const card of (released.rows || [])) {
          io.to(boardId).emit('card:unlocked', { cardId: card.id });
        }
        if (roomUsers.has(boardId)) {
          roomUsers.get(boardId).delete(socket.id);
          const activeUsers = [...roomUsers.get(boardId).values()];
          io.to(boardId).emit('presence:update', { activeUsers });
        }
      }
    } catch (err) {
      // silent
    }
  });
};

module.exports = { registerPresenceHandlers };
