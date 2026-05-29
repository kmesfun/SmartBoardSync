const { releaseAllLocksByUser } = require('../db/queries/cards');
const { isBoardMember } = require('../db/queries/boards');

const roomUsers = new Map(); // boardId -> Map<socketId, {id, name}>

function leaveBoard(io, socket, boardId) {
  if (!boardId) return;
  socket.leave(boardId);
  if (roomUsers.has(boardId)) {
    roomUsers.get(boardId).delete(socket.id);
    const activeUsers = [...roomUsers.get(boardId).values()];
    io.to(boardId).emit('presence:update', { activeUsers });
  }
}

const registerPresenceHandlers = (io, socket) => {
  socket.on('presence:join', async ({ boardId }) => {
    try {
      const membership = await isBoardMember(boardId, socket.userId);
      if (!membership.rows[0]) {
        socket.emit('error', { message: 'Forbidden' });
        return;
      }

      // Leave previous board room if switching boards
      const prevBoard = socket.currentBoard;
      if (prevBoard && prevBoard !== boardId) {
        leaveBoard(io, socket, prevBoard);
      }

      socket.join(boardId);
      socket.currentBoard = boardId;

      if (!roomUsers.has(boardId)) roomUsers.set(boardId, new Map());
      roomUsers.get(boardId).set(socket.id, { id: socket.userId, name: socket.userName });

      const activeUsers = [...roomUsers.get(boardId).values()];
      io.to(boardId).emit('presence:update', { activeUsers });
    } catch (err) {
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  socket.on('disconnect', async () => {
    try {
      const released = await releaseAllLocksByUser(socket.userId);
      const boardId = socket.currentBoard;

      if (boardId) {
        for (const card of (released.rows || [])) {
          io.to(boardId).emit('card:unlocked', { cardId: card.id });
        }
        leaveBoard(io, socket, boardId);
      }
    } catch (err) {
      // silent
    }
  });
};

module.exports = { registerPresenceHandlers };
