// Socket.io klienti — Supabase realtime o'rniga jonli yangilanish.
import { io } from 'socket.io-client';
import { getToken } from './api';

// Bo'sh URL => same-origin (nginx /socket.io ni backendga proxy qiladi).
const URL = import.meta.env.VITE_SOCKET_URL || undefined;

export const socket = io(URL, {
  path: '/socket.io',
  autoConnect: false,
  auth: (cb) => cb({ token: getToken() }),
  reconnection: true,
  reconnectionDelay: 2000,
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
