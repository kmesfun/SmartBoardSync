import { io } from 'socket.io-client';

// Singleton socket instance — exported as default for easy mocking in tests
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
  auth: { token: localStorage.getItem('token') },
  autoConnect: false,
});

export function reconnectWithToken() {
  socket.auth = { token: localStorage.getItem('token') };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}

export default socket;

// Legacy compat for components that call getSocket()
export function getSocket() {
  return socket;
}
