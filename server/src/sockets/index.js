const jwt = require('jsonwebtoken');
const { registerPresenceHandlers } = require('./presence');
const { registerCardHandlers } = require('./cards');

const registerSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = user.id;
      socket.userName = user.name;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    registerPresenceHandlers(io, socket);
    registerCardHandlers(io, socket);
  });
};

module.exports = { registerSocketHandlers };
