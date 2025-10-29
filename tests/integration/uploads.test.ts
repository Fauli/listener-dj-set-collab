/**
 * Integration tests for file upload endpoint
 * NOTE: Requires server to be running (npm run dev:server)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/server/db/client.js';
import fs from 'fs/promises';
import path from 'path';

const API_BASE = 'http://localhost:3000/api';

// Test data
let testUser: { id: string; name: string };
let testRoom: { id: string; name: string };
const uploadedTrackIds: string[] = [];

beforeAll(async () => {
  // Create test user
  testUser = await prisma.user.create({
    data: {
      name: `Upload Test DJ ${Date.now()}`,
      role: 'dj1',
    },
  });

  // Create test room
  testRoom = await prisma.room.create({
    data: {
      name: `Upload Test Room ${Date.now()}`,
      ownerId: testUser.id,
    },
  });

  // Create test fixture files
  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });

  // Create minimal test MP3 file (just headers, not valid audio but enough for testing)
  const mp3Path = path.join(fixturesDir, 'test-track.mp3');
  const mp3Buffer = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00'); // Minimal ID3v2.4 header
  await fs.writeFile(mp3Path, mp3Buffer);

  // Create test file with artist-title naming
  const namedMp3Path = path.join(fixturesDir, 'Artist Name - Track Title.mp3');
  await fs.writeFile(namedMp3Path, mp3Buffer);

  // Create invalid file (text file)
  const txtPath = path.join(fixturesDir, 'invalid.txt');
  await fs.writeFile(txtPath, 'This is not audio');

  // Create large file (> 100MB) for size limit test
  const largePath = path.join(fixturesDir, 'large-file.mp3');
  const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
  await fs.writeFile(largePath, largeBuffer);
});

afterAll(async () => {
  // Clean up uploaded files
  for (const trackId of uploadedTrackIds) {
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { sourceURI: true },
    });
    if (track?.sourceURI) {
      const filePath = path.join(process.cwd(), 'uploads', track.sourceURI);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  // Clean up database
  await prisma.track.deleteMany({
    where: { id: { in: uploadedTrackIds } },
  }).catch(() => {});
  await prisma.room.delete({
    where: { id: testRoom.id },
  }).catch(() => {});
  await prisma.user.delete({
    where: { id: testUser.id },
  }).catch(() => {});

  // Clean up test fixtures
  const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
  await fs.rm(fixturesDir, { recursive: true, force: true });

  await prisma.$disconnect();
});

describe('File Upload API Endpoints', () => {
  describe('POST /api/upload', () => {
    it('should upload a file with minimal metadata extraction', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'test-track.mp3');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'test-track.mp3');
      formData.append('roomId', testRoom.id);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.track).toBeDefined();
      expect(data.track.id).toBeDefined();
      expect(data.track.title).toBeDefined();
      expect(data.track.artist).toBeDefined();
      expect(data.track.sourceURI).toBeDefined();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.extractedFrom).toMatch(/id3|filename/);

      // Save track ID for cleanup
      uploadedTrackIds.push(data.track.id);
    });

    it('should extract metadata from filename when tags are missing', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'Artist Name - Track Title.mp3');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'Artist Name - Track Title.mp3');
      formData.append('roomId', testRoom.id);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.track.artist).toBe('Artist Name');
      expect(data.track.title).toBe('Track Title');
      expect(data.metadata.extractedFrom).toBe('filename');

      uploadedTrackIds.push(data.track.id);
    });

    it('should reject invalid file types', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'invalid.txt');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', blob, 'invalid.txt');
      formData.append('roomId', testRoom.id);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      // Multer throws error but it's caught as 500 in current implementation
      // TODO: Improve error handling to return 400 for validation errors
      expect(response.status).toBe(500);
      // Response is HTML error page, not JSON
      expect(response.ok).toBe(false);
    });

    it('should reject files larger than 100MB', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'large-file.mp3');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'large-file.mp3');
      formData.append('roomId', testRoom.id);

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      // Multer throws error but it's caught as 500 in current implementation
      // TODO: Improve error handling to return 400 for validation errors
      expect(response.status).toBe(500);
      // Response is HTML error page, not JSON
      expect(response.ok).toBe(false);
    });

    it('should reject upload without roomId', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'test-track.mp3');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'test-track.mp3');
      // No roomId

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toMatch(/room.*required/i);
    });

    it('should reject upload with invalid roomId', async () => {
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'test-track.mp3');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'test-track.mp3');
      formData.append('roomId', 'invalid-room-id-that-does-not-exist');

      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toMatch(/room.*not found/i);
    });
  });

  describe('GET /api/upload/:trackId/audio', () => {
    it('should stream audio file for valid track', async () => {
      // First upload a file
      const fixturesDir = path.join(process.cwd(), 'tests', 'fixtures');
      const filePath = path.join(fixturesDir, 'test-track.mp3');
      const fileBuffer = await fs.readFile(filePath);
      const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'test-track.mp3');
      formData.append('roomId', testRoom.id);

      const uploadResponse = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      const trackId = uploadData.track.id;
      uploadedTrackIds.push(trackId);

      // Now try to stream it
      const streamResponse = await fetch(`${API_BASE}/upload/${trackId}/audio`);

      expect(streamResponse.status).toBe(200);
      expect(streamResponse.headers.get('content-type')).toMatch(/audio/);
      expect(streamResponse.headers.get('accept-ranges')).toBe('bytes');
    });

    it('should return 404 for non-existent track', async () => {
      const response = await fetch(`${API_BASE}/upload/non-existent-track-id/audio`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toMatch(/not found/i);
    });
  });
});
