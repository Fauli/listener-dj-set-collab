/**
 * Integration tests for room API endpoints
 * NOTE: Requires server to be running (npm run dev:server)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/server/db/client.js';
const API_BASE = 'http://localhost:3000/api';

// Test user for room ownership
let testUser: { id: string; name: string };
let createdRoomId: string;

beforeAll(async () => {
  // Create a test user for room ownership with unique name
  testUser = await prisma.user.create({
    data: {
      name: `API Test DJ ${Date.now()}`,
      role: 'dj1',
    },
  });
});

afterAll(async () => {
  // Clean up: Delete created rooms and test user
  await prisma.room.deleteMany({
    where: {
      ownerId: testUser.id,
    },
  }).catch(() => {});

  await prisma.user.delete({
    where: {
      id: testUser.id,
    },
  }).catch(() => {});

  await prisma.$disconnect();
});

describe('Room API Endpoints', () => {
  describe('POST /api/rooms', () => {
    it('should create a new room with valid data', async () => {
      const response = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Friday Night Mix',
          ownerId: testUser.id,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.room).toBeDefined();
      expect(data.room.name).toBe('Friday Night Mix');
      expect(data.room.ownerId).toBe(testUser.id);
      expect(data.room.owner.name).toBe(testUser.name);
      expect(data.joinLink).toContain(`/rooms/${data.room.id}`);

      // Save room ID for later tests
      createdRoomId = data.room.id;
    });

    it('should reject room creation with missing name', async () => {
      const response = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId: testUser.id,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject room creation with empty name', async () => {
      const response = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '',
          ownerId: testUser.id,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject room creation with invalid owner ID', async () => {
      const response = await fetch(`${API_BASE}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Test Room',
          ownerId: 'not-a-uuid',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('should get room by ID', async () => {
      const response = await fetch(`${API_BASE}/rooms/${createdRoomId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.room).toBeDefined();
      expect(data.room.id).toBe(createdRoomId);
      expect(data.room.name).toBe('Friday Night Mix');
      expect(data.room.owner).toBeDefined();
      expect(data.room.setEntries).toBeDefined();
      expect(Array.isArray(data.room.setEntries)).toBe(true);
    });

    it('should return 404 for non-existent room', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${API_BASE}/rooms/${fakeId}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid room ID format', async () => {
      const response = await fetch(`${API_BASE}/rooms/not-a-uuid`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/rooms', () => {
    it('should list all rooms', async () => {
      const response = await fetch(`${API_BASE}/rooms`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rooms).toBeDefined();
      expect(Array.isArray(data.rooms)).toBe(true);
      expect(data.count).toBeGreaterThan(0);

      // Should include our created room
      const ourRoom = data.rooms.find((r: { id: string }) => r.id === createdRoomId);
      expect(ourRoom).toBeDefined();
    });

    it('should respect limit parameter', async () => {
      const response = await fetch(`${API_BASE}/rooms?limit=1`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rooms.length).toBeLessThanOrEqual(1);
    });
  });

  describe('DELETE /api/rooms/:id', () => {
    it('should delete room by ID', async () => {
      const response = await fetch(`${API_BASE}/rooms/${createdRoomId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Room deleted successfully');
      expect(data.room.id).toBe(createdRoomId);
    });

    it('should return 404 when deleting non-existent room', async () => {
      const response = await fetch(`${API_BASE}/rooms/${createdRoomId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid room ID format', async () => {
      const response = await fetch(`${API_BASE}/rooms/not-a-uuid`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(400);
    });
  });
});
