/**
 * WebSocket handlers for room operations
 */

import { Server, Socket } from 'socket.io';
import { getRoomById } from '../models/Room.js';
import { createSession, getActiveSessions, endSession } from '../models/Session.js';

interface JoinRoomData {
  roomId: string;
  userId: string;
}

/**
 * Handle user joining a room
 */
export async function handleJoinRoom(io: Server, socket: Socket, data: JoinRoomData) {
  try {
    const { roomId, userId } = data;

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
        position: entry.position,
        note: entry.note,
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

    // eslint-disable-next-line no-console
    console.log(`User ${session.user.name} joined room ${room.name} (${roomId})`);
  } catch (error) {
    console.error('Error in handleJoinRoom:', error);
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
    // Find and end the session
    const session = await endSession(socket.id);

    if (session.count > 0) {
      // We don't have the room/user info here anymore, but we can get it from socket rooms
      const rooms = Array.from(socket.rooms).filter((room) => room !== socket.id);

      for (const roomId of rooms) {
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
      }

      // eslint-disable-next-line no-console
      console.log(`Socket ${socket.id} disconnected and session ended`);
    }
  } catch (error) {
    console.error('Error in handleDisconnect:', error);
  }
}

/**
 * Register all room-related socket handlers
 */
export function registerRoomHandlers(io: Server, socket: Socket) {
  socket.on('room:join', (data: JoinRoomData) => handleJoinRoom(io, socket, data));
  socket.on('disconnect', () => handleDisconnect(io, socket));
}
