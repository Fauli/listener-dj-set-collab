/**
 * WebSocket service using Socket.io client
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Get or create socket connection
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    });

    // Global error handler
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Connection status logging (dev only)
    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      // eslint-disable-next-line no-console
      console.log('Socket disconnected:', reason);
    });
  }

  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Join a room
 */
export function joinRoom(roomId: string, userId: string) {
  const sock = getSocket();
  sock.emit('room:join', { roomId, userId });
}

/**
 * Listen for room state updates
 */
export function onRoomState(callback: (data: RoomState) => void) {
  const sock = getSocket();
  sock.on('room:state', callback);
  return () => sock.off('room:state', callback);
}

/**
 * Listen for user joined events
 */
export function onUserJoined(callback: (data: UserJoinedData) => void) {
  const sock = getSocket();
  sock.on('user:joined', callback);
  return () => sock.off('user:joined', callback);
}

/**
 * Listen for user left events
 */
export function onUserLeft(callback: (data: UserLeftData) => void) {
  const sock = getSocket();
  sock.on('user:left', callback);
  return () => sock.off('user:left', callback);
}

// Types for socket events
export interface RoomState {
  room: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      role: string;
    };
  };
  users: Array<{
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
  tracks: Array<{
    id: string;
    position: number;
    note?: string;
    track: {
      id: string;
      title: string;
      artist: string;
      bpm?: number;
      key?: string;
      energy?: number;
    };
  }>;
}

export interface UserJoinedData {
  user: {
    id: string;
    name: string;
    role: string;
  };
  joinedAt: string;
}

export interface UserLeftData {
  users: Array<{
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
}
