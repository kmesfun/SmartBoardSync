require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { registerSocketHandlers } = require('./sockets');

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
