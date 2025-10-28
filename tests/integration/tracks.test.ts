/**
 * Integration tests for track/playlist API endpoints
 * NOTE: Requires server to be running (npm run dev:server)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/server/db/client.js';

const API_BASE = 'http://localhost:3000/api';

// Test data
let testUser: { id: string; name: string };
let testRoom: { id: string; name: string };
let createdEntryId: string;

beforeAll(async () => {
  // Create test user
  testUser = await prisma.user.create({
    data: {
      name: `Track Test DJ ${Date.now()}`,
      role: 'dj1',
    },
  });

  // Create test room
  testRoom = await prisma.room.create({
    data: {
      name: `Track Test Room ${Date.now()}`,
      ownerId: testUser.id,
    },
  });
});

afterAll(async () => {
  // Clean up
  await prisma.setEntry.deleteMany({
    where: { roomId: testRoom.id },
  }).catch(() => {});
  await prisma.track.deleteMany().catch(() => {}); // Clean up tracks created during tests
  await prisma.room.delete({
    where: { id: testRoom.id },
  }).catch(() => {});
  await prisma.user.delete({
    where: { id: testUser.id },
  }).catch(() => {});
  await prisma.$disconnect();
});

describe('Track/Playlist API Endpoints', () => {
  describe('POST /api/rooms/:roomId/tracks', () => {
    it('should add a new track to playlist', async () => {
      const response = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: {
            title: 'Test Track 1',
            artist: 'Test Artist',
            bpm: 128,
            key: 'Am',
            energy: 7,
          },
          position: 0,
          note: 'Opening track',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.setEntry).toBeDefined();
      expect(data.setEntry.track.title).toBe('Test Track 1');
      expect(data.setEntry.track.artist).toBe('Test Artist');
      expect(data.setEntry.position).toBe(0);
      expect(data.setEntry.note).toBe('Opening track');

      // Save for later tests
      createdEntryId = data.setEntry.id;
    });

    it('should return 404 for non-existent room', async () => {
      const response = await fetch(`${API_BASE}/rooms/non-existent-id/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: { title: 'Test', artist: 'Test' },
          position: 0,
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should validate track data', async () => {
      const response = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: {
            title: '', // Empty title should fail
            artist: 'Test Artist',
          },
          position: 0,
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });
  });

  describe('GET /api/rooms/:roomId/tracks', () => {
    it('should get playlist for room', async () => {
      const response = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tracks).toBeInstanceOf(Array);
      expect(data.tracks.length).toBeGreaterThan(0);
      expect(data.tracks[0].track).toBeDefined();
    });

    it('should return 404 for non-existent room', async () => {
      const response = await fetch(`${API_BASE}/rooms/non-existent-id/tracks`);
      expect(response.status).toBe(404);
    });

    it('should return empty array for room with no tracks', async () => {
      // Create a temporary room
      const emptyRoom = await prisma.room.create({
        data: {
          name: 'Empty Room',
          ownerId: testUser.id,
        },
      });

      const response = await fetch(`${API_BASE}/rooms/${emptyRoom.id}/tracks`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tracks).toEqual([]);

      // Clean up
      await prisma.room.delete({ where: { id: emptyRoom.id } });
    });
  });

  describe('PUT /api/rooms/:roomId/tracks/:entryId', () => {
    it('should update track note', async () => {
      const response = await fetch(
        `${API_BASE}/rooms/${testRoom.id}/tracks/${createdEntryId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: 'Updated note - great transition',
          }),
        }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.setEntry.note).toBe('Updated note - great transition');
    });
  });

  describe('DELETE /api/rooms/:roomId/tracks/:entryId', () => {
    it('should remove track from playlist', async () => {
      // Add another track first
      const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: {
            title: 'Track to Delete',
            artist: 'Delete Artist',
          },
          position: 1,
        }),
      });

      const addData = await addResponse.json();
      const entryToDelete = addData.setEntry.id;

      // Delete it
      const response = await fetch(
        `${API_BASE}/rooms/${testRoom.id}/tracks/${entryToDelete}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Track removed from playlist');
      expect(data.setEntry.id).toBe(entryToDelete);
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await fetch(
        `${API_BASE}/rooms/${testRoom.id}/tracks/non-existent-id`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(404);
    });
  });
});
