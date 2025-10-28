/**
 * Session model service
 * Handles tracking active user sessions in rooms
 */

import { prisma } from '../db/client.js';

export interface CreateSessionData {
  userId: string;
  roomId: string;
  socketId: string;
}

/**
 * Create a new session when user joins room
 */
export async function createSession(data: CreateSessionData) {
  const session = await prisma.session.create({
    data: {
      userId: data.userId,
      roomId: data.roomId,
      socketId: data.socketId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return session;
}

/**
 * Get active sessions for a room
 */
export async function getActiveSessions(roomId: string) {
  const sessions = await prisma.session.findMany({
    where: {
      roomId,
      leftAt: null, // Only active sessions
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });

  return sessions;
}

/**
 * Get session by socket ID
 */
export async function getSessionBySocketId(socketId: string) {
  const session = await prisma.session.findFirst({
    where: {
      socketId,
      leftAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      room: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return session;
}

/**
 * End session when user leaves (disconnect or explicit leave)
 */
export async function endSession(socketId: string) {
  const session = await prisma.session.updateMany({
    where: {
      socketId,
      leftAt: null,
    },
    data: {
      leftAt: new Date(),
    },
  });

  return session;
}

/**
 * Clean up old sessions (optional - for maintenance)
 */
export async function cleanupOldSessions(olderThanHours = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

  const deleted = await prisma.session.deleteMany({
    where: {
      leftAt: {
        lt: cutoffDate,
      },
    },
  });

  return deleted;
}
