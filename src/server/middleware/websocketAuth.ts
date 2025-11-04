/**
 * WebSocket authentication middleware
 * Validates that Socket.io connections have valid authenticated sessions
 */

import type { Socket } from 'socket.io';
import { logWarn, logInfo } from './logger.js';
import { checkWebSocketRateLimit, decrementWebSocketRateLimit } from './rateLimiter.js';

/**
 * Extended Socket interface with session and user data
 */
export interface AuthenticatedSocket extends Socket {
  request: Socket['request'] & {
    session?: {
      passport?: {
        user?: string; // User ID from Passport session
      };
    };
  };
  userId?: string;
  userEmail?: string;
}

/**
 * Extracts user ID from session
 */
function getUserIdFromSession(socket: AuthenticatedSocket): string | null {
  return socket.request.session?.passport?.user || null;
}

/**
 * WebSocket authentication middleware
 * Validates that the connection has a valid session with authenticated user
 * Also applies rate limiting to prevent WebSocket flooding
 */
export function authenticateWebSocket(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): void {
  const clientIp = socket.handshake.address;

  // Rate limiting check
  if (checkWebSocketRateLimit(clientIp)) {
    logWarn('WebSocket connection rejected - rate limit exceeded', {
      ip: clientIp,
      socketId: socket.id,
    });
    next(new Error('Too many connection attempts. Please try again later.'));
    return;
  }

  // Check for valid session
  const userId = getUserIdFromSession(socket);

  if (!userId) {
    logWarn('WebSocket connection rejected - no valid session', {
      ip: clientIp,
      socketId: socket.id,
    });
    next(new Error('Authentication required. Please log in.'));
    return;
  }

  // Attach user ID to socket for use in handlers
  socket.userId = userId;

  logInfo('WebSocket connection authenticated', {
    socketId: socket.id,
    userId,
    ip: clientIp,
  });

  // Decrement rate limit on disconnect
  socket.on('disconnect', () => {
    decrementWebSocketRateLimit(clientIp);
  });

  next();
}

/**
 * Helper to get authenticated user ID from socket
 * Throws error if socket is not authenticated (should never happen if middleware is properly applied)
 */
export function getAuthenticatedUserId(socket: AuthenticatedSocket): string {
  if (!socket.userId) {
    throw new Error('Socket is not authenticated. This should never happen.');
  }
  return socket.userId;
}

/**
 * Helper to validate that a user owns a specific room
 * Used in handlers that modify or delete rooms
 */
export async function validateRoomOwnership(
  userId: string,
  roomId: string,
  prisma: any
): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { userId: true },
  });

  return room?.userId === userId;
}
