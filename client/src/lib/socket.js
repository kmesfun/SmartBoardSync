import { io } from 'socket.io-client';

// Lazy singleton — created on first access to avoid blocking module load
let _socket = null;

function createSocket() {
  if (_socket) return _socket;
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    _socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
      auth: { token },
      autoConnect: false,
    });
  } catch {
    // Fallback stub for environments where socket.io can't connect (tests, SSR)
    _socket = {
      connected: false,
      connect: () => {},
      disconnect: () => {},
      emit: () => {},
      on: () => {},
      off: () => {},
      auth: {},
    };
  }
  return _socket;
}

export function getSocket() {
  return createSocket();
}

export function reconnectWithToken() {
  const s = createSocket();
  // Always disconnect first so the server re-runs the auth handshake with the new token.
  if (s.connected) s.disconnect();
  s.auth = { token: typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null };
  s.connect();
}

export function disconnectSocket() {
  if (_socket) _socket.disconnect();
}

export const resetSocket = disconnectSocket;

// Default export returns the socket (lazy)
export default new Proxy({}, {
  get(_, prop) {
    return createSocket()[prop];
  },
  set(_, prop, value) {
    createSocket()[prop] = value;
    return true;
  },
});
