/**
 * Integration tests for cue points persistence
 * Tests the bug we just fixed: cue points not loading after room reload
 *
 * NOTE: Requires server to be running (npm run dev:server)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/server/db/client.js';

const API_BASE = 'http://localhost:3000/api';

// Test data
let testUser: { id: string; name: string };
let testRoom: { id: string; name: string };
let testTrack: { id: string };

beforeAll(async () => {
  // Create test user
  testUser = await prisma.user.create({
    data: {
      name: `Cue Points Test DJ ${Date.now()}`,
      role: 'dj1',
    },
  });

  // Create test room
  testRoom = await prisma.room.create({
    data: {
      name: `Cue Points Test Room ${Date.now()}`,
      ownerId: testUser.id,
    },
  });

  // Create test track
  testTrack = await prisma.track.create({
    data: {
      title: 'Test Track for Cue Points',
      artist: 'Test Artist',
      bpm: 128,
      key: 'Am',
    },
  });
});

beforeEach(async () => {
  // Clean up set entries before each test
  await prisma.setEntry.deleteMany({
    where: { roomId: testRoom.id },
  });
});

afterAll(async () => {
  // Clean up in correct order
  await prisma.setEntry.deleteMany({
    where: { roomId: testRoom.id },
  }).catch(() => {});

  await prisma.track.delete({
    where: { id: testTrack.id },
  }).catch(() => {});

  await prisma.room.delete({
    where: { id: testRoom.id },
  }).catch(() => {});

  await prisma.user.delete({
    where: { id: testUser.id },
  }).catch(() => {});

  await prisma.$disconnect();
});

describe('Cue Points Persistence', () => {
  it('should save and retrieve cue points when updating a track', async () => {
    // Add track to playlist
    const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          title: 'Test Track for Cue Points',
          artist: 'Test Artist',
          bpm: 128,
          key: 'Am',
        },
        position: 0,
      }),
    });
    expect(addResponse.ok).toBe(true);
    const { setEntry: addedEntry } = await addResponse.json();

    // Set cue points
    const cuePoints = {
      start: 10.5,
      end: 180.25,
      A: 45.0,
      B: 90.75,
    };

    const updateResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints }),
    });
    expect(updateResponse.ok).toBe(true);

    // Retrieve playlist and verify cue points
    const getResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`);
    expect(getResponse.ok).toBe(true);
    const { tracks: playlist } = await getResponse.json();

    expect(playlist).toHaveLength(1);
    expect(playlist[0].cuePoints).toEqual(cuePoints);
  });

  it('should persist cue points in database after update', async () => {
    // Add track to playlist
    const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          title: 'Test Track 2',
          artist: 'Test Artist',
          bpm: 128,
          key: 'Am',
        },
        position: 0,
      }),
    });
    expect(addResponse.ok).toBe(true);
    const responseData = await addResponse.json();
    expect(responseData.setEntry).toBeDefined();
    const addedEntry = responseData.setEntry;

    // Set cue points
    const cuePoints = {
      start: 5.0,
      end: 200.0,
      A: null,
      B: 100.5,
    };

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints }),
    });

    // Query database directly to verify persistence
    const dbEntry = await prisma.setEntry.findUnique({
      where: { id: addedEntry.id },
    });

    expect(dbEntry).toBeTruthy();
    expect(dbEntry!.cuePoints).toEqual(cuePoints);
  });

  it('should update individual cue points without affecting others', async () => {
    // Add track to playlist
    const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          title: 'Test Track 3',
          artist: 'Test Artist',
          bpm: 128,
          key: 'Am',
        },
        position: 0,
      }),
    });
    expect(addResponse.ok).toBe(true);
    const responseData = await addResponse.json();
    expect(responseData.setEntry).toBeDefined();
    const addedEntry = responseData.setEntry;

    // Set initial cue points
    const initialCuePoints = {
      start: 10.0,
      end: 100.0,
      A: 30.0,
      B: 60.0,
    };

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints: initialCuePoints }),
    });

    // Update only start cue point
    const updatedCuePoints = {
      ...initialCuePoints,
      start: 15.0,
    };

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints: updatedCuePoints }),
    });

    // Verify update
    const getResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`);
    const { tracks: playlist } = await getResponse.json();

    expect(playlist[0].cuePoints).toEqual(updatedCuePoints);
  });

  it('should delete cue points by setting them to null', async () => {
    // Add track to playlist
    const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          title: 'Test Track 4',
          artist: 'Test Artist',
          bpm: 128,
          key: 'Am',
        },
        position: 0,
      }),
    });
    expect(addResponse.ok).toBe(true);
    const responseData = await addResponse.json();
    expect(responseData.setEntry).toBeDefined();
    const addedEntry = responseData.setEntry;

    // Set initial cue points
    const cuePoints = {
      start: 10.0,
      end: 100.0,
      A: 30.0,
      B: 60.0,
    };

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints }),
    });

    // Delete A cue point
    const updatedCuePoints = {
      ...cuePoints,
      A: null,
    };

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints: updatedCuePoints }),
    });

    // Verify deletion
    const getResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`);
    const { tracks: playlist } = await getResponse.json();

    expect(playlist[0].cuePoints.A).toBeNull();
    expect(playlist[0].cuePoints.start).toBe(10.0);
  });

  it('should include cue points when track has no note', async () => {
    // Add track WITHOUT note
    const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          title: 'Test Track 5',
          artist: 'Test Artist',
          bpm: 128,
          key: 'Am',
        },
        position: 0,
      }),
    });
    expect(addResponse.ok).toBe(true);
    const responseData = await addResponse.json();
    expect(responseData.setEntry).toBeDefined();
    const addedEntry = responseData.setEntry;

    // Set cue points
    const cuePoints = {
      start: 20.0,
      end: 150.0,
      A: 50.0,
      B: null,
    };

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuePoints }),
    });

    // Retrieve and verify
    const getResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`);
    const { tracks: playlist } = await getResponse.json();

    expect(playlist[0].note).toBeNull();
    expect(playlist[0].cuePoints).toEqual(cuePoints);
  });

  it('should handle updating both note and cue points simultaneously', async () => {
    // Add track to playlist
    const addResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          title: 'Test Track 6',
          artist: 'Test Artist',
          bpm: 128,
          key: 'Am',
        },
        position: 0,
      }),
    });
    expect(addResponse.ok).toBe(true);
    const responseData = await addResponse.json();
    expect(responseData.setEntry).toBeDefined();
    const addedEntry = responseData.setEntry;

    // Update both note and cue points
    const cuePoints = {
      start: 12.5,
      end: 175.0,
      A: 40.0,
      B: 80.0,
    };
    const note = 'Drop at A, build at B';

    await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks/${addedEntry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, cuePoints }),
    });

    // Verify both updated
    const getResponse = await fetch(`${API_BASE}/rooms/${testRoom.id}/tracks`);
    const { tracks: playlist } = await getResponse.json();

    expect(playlist[0].note).toBe(note);
    expect(playlist[0].cuePoints).toEqual(cuePoints);
  });
});
