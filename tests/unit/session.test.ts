/**
 * Unit tests for Session model
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/server/db/client.js';
import {
  createSession,
  getActiveSessions,
  getSessionBySocketId,
  endSession,
} from '../../src/server/models/Session.js';

describe('Session Model', () => {
  let testUserId: string;
  let testRoomId: string;
  let testUserName: string;
  let testRoomName: string;

  // Setup: Create test user and room
  beforeEach(async () => {
    // Create test user with unique name to avoid conflicts
    testUserName = `Test User ${Date.now()}`;
    testRoomName = `Test Room ${Date.now()}`;

    const user = await prisma.user.create({
      data: {
        name: testUserName,
        role: 'dj',
      },
    });
    testUserId = user.id;

    // Create test room
    const room = await prisma.room.create({
      data: {
        name: testRoomName,
        ownerId: testUserId,
      },
    });
    testRoomId = room.id;
  });

  afterEach(async () => {
    // Clean up only this test's data
    await prisma.session.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.room.delete({
      where: { id: testRoomId },
    }).catch(() => {});
    await prisma.user.delete({
      where: { id: testUserId },
    }).catch(() => {});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createSession', () => {
    it('should create a session when user joins room', async () => {
      const session = await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-123',
      });

      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.roomId).toBe(testRoomId);
      expect(session.socketId).toBe('socket-123');
      expect(session.leftAt).toBeNull();
      expect(session.user).toBeDefined();
      expect(session.user.name).toBe(testUserName);
    });

    it('should include user and room data in response', async () => {
      const session = await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-456',
      });

      expect(session.user).toEqual({
        id: testUserId,
        name: testUserName,
        role: 'dj',
      });
      expect(session.room).toEqual({
        id: testRoomId,
        name: testRoomName,
      });
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions for a room', async () => {
      // Create two active sessions
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-1',
      });

      // Create another user
      const user2 = await prisma.user.create({
        data: { name: 'User 2', role: 'dj2' },
      });

      await createSession({
        userId: user2.id,
        roomId: testRoomId,
        socketId: 'socket-2',
      });

      const sessions = await getActiveSessions(testRoomId);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].user.name).toBe(testUserName);
      expect(sessions[1].user.name).toBe('User 2');
    });

    it('should only return sessions where leftAt is null', async () => {
      // Create active session
      const session1 = await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-active',
      });

      // Create and end another session
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-ended',
      });
      await endSession('socket-ended');

      const activeSessions = await getActiveSessions(testRoomId);

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(session1.id);
      expect(activeSessions[0].leftAt).toBeNull();
    });

    it('should return empty array for room with no active sessions', async () => {
      const sessions = await getActiveSessions(testRoomId);
      expect(sessions).toEqual([]);
    });

    it('should order sessions by joinedAt ascending', async () => {
      const user2 = await prisma.user.create({
        data: { name: 'User 2', role: 'dj2' },
      });

      // Create sessions with slight delay to ensure different timestamps
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-first',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await createSession({
        userId: user2.id,
        roomId: testRoomId,
        socketId: 'socket-second',
      });

      const sessions = await getActiveSessions(testRoomId);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].user.name).toBe(testUserName);
      expect(sessions[1].user.name).toBe('User 2');
      expect(sessions[0].joinedAt.getTime()).toBeLessThanOrEqual(
        sessions[1].joinedAt.getTime()
      );
    });
  });

  describe('getSessionBySocketId', () => {
    it('should return session by socket ID', async () => {
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-find-me',
      });

      const session = await getSessionBySocketId('socket-find-me');

      expect(session).toBeDefined();
      expect(session?.socketId).toBe('socket-find-me');
      expect(session?.user.name).toBe(testUserName);
      expect(session?.room.name).toBe(testRoomName);
    });

    it('should return null for non-existent socket ID', async () => {
      const session = await getSessionBySocketId('non-existent');
      expect(session).toBeNull();
    });

    it('should not return ended sessions', async () => {
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-ended',
      });

      await endSession('socket-ended');

      const session = await getSessionBySocketId('socket-ended');
      expect(session).toBeNull();
    });
  });

  describe('endSession', () => {
    it('should end session by setting leftAt timestamp', async () => {
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-to-end',
      });

      const result = await endSession('socket-to-end');

      expect(result.count).toBe(1);

      // Verify session is no longer active
      const activeSessions = await getActiveSessions(testRoomId);
      expect(activeSessions).toHaveLength(0);
    });

    it('should return count 0 for non-existent socket', async () => {
      const result = await endSession('non-existent');
      expect(result.count).toBe(0);
    });

    it('should only end active sessions', async () => {
      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-already-ended',
      });

      // End it once
      const result1 = await endSession('socket-already-ended');
      expect(result1.count).toBe(1);

      // Try to end again
      const result2 = await endSession('socket-already-ended');
      expect(result2.count).toBe(0);
    });
  });

  describe('Multiple sessions in same room', () => {
    it('should handle multiple users in same room', async () => {
      const user2 = await prisma.user.create({
        data: { name: 'User 2', role: 'dj2' },
      });
      const user3 = await prisma.user.create({
        data: { name: 'User 3', role: 'dj3' },
      });

      await createSession({
        userId: testUserId,
        roomId: testRoomId,
        socketId: 'socket-1',
      });
      await createSession({
        userId: user2.id,
        roomId: testRoomId,
        socketId: 'socket-2',
      });
      await createSession({
        userId: user3.id,
        roomId: testRoomId,
        socketId: 'socket-3',
      });

      const sessions = await getActiveSessions(testRoomId);
      expect(sessions).toHaveLength(3);

      // End one session
      await endSession('socket-2');

      const remainingSessions = await getActiveSessions(testRoomId);
      expect(remainingSessions).toHaveLength(2);
      expect(remainingSessions.map((s) => s.user.name)).toEqual([testUserName, 'User 3']);
    });
  });
});
