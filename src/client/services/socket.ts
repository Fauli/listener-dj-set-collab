/**
 * WebSocket service using Socket.io client
 */

import { io, Socket } from 'socket.io-client';
import type {
  RoomState,
  UserJoinedData,
  UserLeftData,
  TrackAddedData,
  TrackRemovedData,
  TrackUpdatedData,
  TrackReorderedData,
  Track,
} from '../../shared/types/index.js';

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

/**
 * Listen for track added events
 */
export function onTrackAdded(callback: (data: TrackAddedData) => void) {
  const sock = getSocket();
  sock.on('playlist:track-added', callback);
  return () => sock.off('playlist:track-added', callback);
}

/**
 * Listen for track removed events
 */
export function onTrackRemoved(callback: (data: TrackRemovedData) => void) {
  const sock = getSocket();
  sock.on('playlist:track-removed', callback);
  return () => sock.off('playlist:track-removed', callback);
}

/**
 * Listen for track updated events
 */
export function onTrackUpdated(callback: (data: TrackUpdatedData) => void) {
  const sock = getSocket();
  sock.on('playlist:track-updated', callback);
  return () => sock.off('playlist:track-updated', callback);
}

/**
 * Listen for track reordered events
 */
export function onTrackReordered(callback: (data: TrackReorderedData) => void) {
  const sock = getSocket();
  sock.on('playlist:track-reordered', callback);
  return () => sock.off('playlist:track-reordered', callback);
}

/**
 * Emit add track event
 */
export function addTrack(roomId: string, track: Omit<Track, 'id' | 'createdAt'>, position: number, note?: string) {
  const sock = getSocket();
  sock.emit('playlist:add-track', { roomId, track, position, note });
}

/**
 * Emit remove track event
 */
export function removeTrack(roomId: string, entryId: string) {
  const sock = getSocket();
  sock.emit('playlist:remove-track', { roomId, entryId });
}

/**
 * Emit update note event
 */
export function updateTrackNote(roomId: string, entryId: string, note: string) {
  const sock = getSocket();
  sock.emit('playlist:update-note', { roomId, entryId, note });
}

/**
 * Emit reorder track event
 */
export function reorderTrack(roomId: string, entryId: string, newPosition: number) {
  const sock = getSocket();
  sock.emit('playlist:reorder', { roomId, entryId, newPosition });
}

// Re-export types for convenience
export type {
  RoomState,
  UserJoinedData,
  UserLeftData,
  TrackAddedData,
  TrackRemovedData,
  TrackUpdatedData,
  TrackReorderedData,
  Track,
};
