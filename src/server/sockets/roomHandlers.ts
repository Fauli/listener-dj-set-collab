/**
 * WebSocket handlers for room operations
 */

import { Server, Socket } from 'socket.io';
import { getRoomById } from '../models/Room.js';
import { createSession, getActiveSessions, endSession, getSessionBySocketId } from '../models/Session.js';
import { getAuthenticatedUserId, type AuthenticatedSocket } from '../middleware/websocketAuth.js';
import { logInfo, logError } from '../middleware/logger.js';

interface JoinRoomData {
  roomId: string;
}

/**
 * Handle user joining a room
 */
export async function handleJoinRoom(io: Server, socket: AuthenticatedSocket, data: JoinRoomData) {
  try {
    const { roomId } = data;

    // Get authenticated user ID from socket (set by authentication middleware)
    const userId = getAuthenticatedUserId(socket);

    // Validate room exists
    const room = await getRoomById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Create session to track user in room
    const session = await createSession({
      userId,
      roomId,
      socketId: socket.id,
    });

    // Join Socket.io room
    await socket.join(roomId);

    // Get all active sessions in room
    const activeSessions = await getActiveSessions(roomId);

    // Send current room state to joining user
    socket.emit('room:state', {
      room: {
        id: room.id,
        name: room.name,
        owner: room.owner,
      },
      users: activeSessions.map((s) => ({
        id: s.user.id,
        name: s.user.name,
        role: s.user.role,
        joinedAt: s.joinedAt,
      })),
      tracks: room.setEntries.map((entry) => ({
        id: entry.id,
        roomId: entry.roomId,
        trackId: entry.trackId,
        position: entry.position,
        note: entry.note,
        cuePoints: entry.cuePoints, // Include cue points!
        createdAt: entry.createdAt,
        track: entry.track,
      })),
    });

    // Notify others in room that new user joined
    socket.to(roomId).emit('user:joined', {
      user: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      },
      joinedAt: session.joinedAt,
    });

    logInfo('User joined room', {
      userName: session.user.name,
      userId: session.user.id,
      roomName: room.name,
      roomId,
    });
  } catch (error) {
    logError('Error in handleJoinRoom', error);
    socket.emit('error', {
      message: 'Failed to join room',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle user disconnecting
 */
export async function handleDisconnect(io: Server, socket: Socket) {
  try {
    // Get session data BEFORE ending it (so we have the roomId)
    const session = await getSessionBySocketId(socket.id);

    if (session) {
      const roomId = session.roomId;

      // Now end the session
      await endSession(socket.id);

      // Get remaining active sessions to broadcast updated user list
      const activeSessions = await getActiveSessions(roomId);

      // Notify others that user left
      io.to(roomId).emit('user:left', {
        users: activeSessions.map((s) => ({
          id: s.user.id,
          name: s.user.name,
          role: s.user.role,
          joinedAt: s.joinedAt,
        })),
      });

      logInfo('User disconnected and session ended', {
        socketId: socket.id,
        roomId,
      });
    }
  } catch (error) {
    logError('Error in handleDisconnect', error);
  }
}

/**
 * Register all room-related socket handlers
 */
export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on('room:join', (data: JoinRoomData) => handleJoinRoom(io, socket, data));
  socket.on('disconnect', () => handleDisconnect(io, socket));
}
