/**
 * Unit tests for setPlaytime utilities
 * Tests set playtime calculations with cue points
 */

import { describe, it, expect } from 'vitest';
import { calculateSetPlaytime } from '../../src/client/utils/setPlaytime.js';
import type { SetEntry, Track } from '../../shared/types/index.js';

// Helper to create mock track
function createTrack(id: string, duration: number): Track {
  return {
    id,
    title: `Track ${id}`,
    artist: 'Test Artist',
    bpm: 120,
    key: '8A',
    duration,
    filePath: `/path/to/${id}.mp3`,
    uploadedBy: 'test-user',
    uploadedAt: new Date(),
  };
}

// Helper to create set entry
function createSetEntry(
  trackId: string,
  duration: number,
  cuePoints?: { start: number | null; end: number | null; A?: number | null; B?: number | null }
): SetEntry & { track: Track } {
  return {
    id: `entry-${trackId}`,
    roomId: 'test-room',
    trackId,
    position: 0,
    note: null,
    cueIn: null,
    cueOut: null,
    cuePoints: cuePoints || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    track: createTrack(trackId, duration),
  };
}

describe('setPlaytime utilities', () => {
  describe('calculateSetPlaytime()', () => {
    it('should return zero for empty playlist', () => {
      const result = calculateSetPlaytime([]);

      expect(result.totalDuration).toBe(0);
      expect(result.cueBasedDuration).toBe(0);
      expect(result.formattedTotal).toBe('00:00:00');
      expect(result.formattedCueBased).toBe('00:00:00');
    });

    it('should calculate single track duration', () => {
      const tracks = [createSetEntry('1', 180)]; // 3 minutes

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(180);
      expect(result.cueBasedDuration).toBe(180);
      expect(result.formattedTotal).toBe('00:03:00');
      expect(result.formattedCueBased).toBe('00:03:00');
    });

    it('should calculate multiple tracks duration', () => {
      const tracks = [
        createSetEntry('1', 180), // 3 min
        createSetEntry('2', 240), // 4 min
        createSetEntry('3', 300), // 5 min
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(720); // 12 minutes
      expect(result.cueBasedDuration).toBe(720);
      expect(result.formattedTotal).toBe('00:12:00');
    });

    it('should use cue points when both start and end are set', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 10, end: 290 }), // 280s instead of 300s
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(300); // Full track
      expect(result.cueBasedDuration).toBe(280); // Cue-based (290-10)
      expect(result.formattedTotal).toBe('00:05:00');
      expect(result.formattedCueBased).toBe('00:04:40');
    });

    it('should fall back to full duration if only start cue is set', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 10, end: null }),
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(300);
      expect(result.cueBasedDuration).toBe(300); // Fallback to full
    });

    it('should fall back to full duration if only end cue is set', () => {
      const tracks = [
        createSetEntry('1', 300, { start: null, end: 290 }),
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(300);
      expect(result.cueBasedDuration).toBe(300); // Fallback to full
    });

    it('should handle mix of tracks with and without cue points', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 10, end: 290 }), // 280s
        createSetEntry('2', 240), // No cues, 240s
        createSetEntry('3', 360, { start: 20, end: 340 }), // 320s
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(900); // 300 + 240 + 360
      expect(result.cueBasedDuration).toBe(840); // 280 + 240 + 320
    });

    it('should use full duration if cue end < cue start (invalid)', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 200, end: 100 }), // Invalid: end < start
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(300);
      expect(result.cueBasedDuration).toBe(300); // Falls back to full duration
    });

    it('should handle tracks with zero duration', () => {
      const tracks = [
        createSetEntry('1', 0),
        createSetEntry('2', 180),
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(180);
      expect(result.cueBasedDuration).toBe(180);
    });

    it('should handle null/undefined durations', () => {
      const track = createSetEntry('1', 180);
      track.track.duration = null as any; // Simulate missing duration

      const result = calculateSetPlaytime([track]);

      expect(result.totalDuration).toBe(0);
      expect(result.cueBasedDuration).toBe(0);
    });

    it('should handle cuePoints with all 4 cue types (start, end, A, B)', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 10, end: 290, A: 50, B: 150 }),
      ];

      const result = calculateSetPlaytime(tracks);

      // Should only use start and end for duration calculation
      expect(result.cueBasedDuration).toBe(280); // end - start
    });

    it('should handle cuePoints = null', () => {
      const track = createSetEntry('1', 180);
      track.cuePoints = null;

      const result = calculateSetPlaytime([track]);

      expect(result.cueBasedDuration).toBe(180);
    });

    it('should format long sets correctly (> 1 hour)', () => {
      const tracks = [
        createSetEntry('1', 3600), // 1 hour
        createSetEntry('2', 1800), // 30 min
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(5400); // 1.5 hours
      expect(result.formattedTotal).toBe('01:30:00');
    });

    it('should format very long sets (> 10 hours)', () => {
      const tracks = [
        createSetEntry('1', 43200), // 12 hours
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('12:00:00');
    });

    it('should format seconds correctly', () => {
      const tracks = [createSetEntry('1', 125)]; // 2:05

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('00:02:05');
    });

    it('should pad single digits with zeros', () => {
      const tracks = [createSetEntry('1', 65)]; // 1:05

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('00:01:05');
    });

    it('should handle exact minutes', () => {
      const tracks = [createSetEntry('1', 300)]; // 5:00

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('00:05:00');
    });

    it('should handle exact hours', () => {
      const tracks = [createSetEntry('1', 7200)]; // 2:00:00

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('02:00:00');
    });

    it('should floor fractional seconds', () => {
      const tracks = [createSetEntry('1', 125.9)]; // Should floor to 125

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('00:02:05');
    });

    it('should handle large playlists (50+ tracks)', () => {
      const tracks = Array.from({ length: 50 }, (_, i) =>
        createSetEntry(`${i}`, 180)
      );

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(9000); // 50 * 180s = 2.5 hours
      expect(result.formattedTotal).toBe('02:30:00');
    });

    it('should calculate different totals for cue-based vs full duration', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 30, end: 270 }), // 240s cued
        createSetEntry('2', 360, { start: 40, end: 320 }), // 280s cued
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(660); // 300 + 360
      expect(result.cueBasedDuration).toBe(520); // 240 + 280
      expect(result.formattedTotal).toBe('00:11:00');
      expect(result.formattedCueBased).toBe('00:08:40');
    });

    it('should handle typical DJ set (10 tracks, mix of cues)', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 10, end: 280 }), // 270s
        createSetEntry('2', 240), // No cues
        createSetEntry('3', 360, { start: 20, end: 340 }), // 320s
        createSetEntry('4', 300), // No cues
        createSetEntry('5', 280, { start: 15, end: 265 }), // 250s
        createSetEntry('6', 320), // No cues
        createSetEntry('7', 300, { start: 10, end: 290 }), // 280s
        createSetEntry('8', 240), // No cues
        createSetEntry('9', 360, { start: 30, end: 330 }), // 300s
        createSetEntry('10', 300, { start: 20, end: 280 }), // 260s
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(3000); // 50 minutes
      expect(result.cueBasedDuration).toBe(2780); // ~46.3 minutes
      expect(result.formattedTotal).toBe('00:50:00');
      expect(result.formattedCueBased).toBe('00:46:20');
    });

    it('should handle cuePoints as object (not null)', () => {
      const track = createSetEntry('1', 300);
      track.cuePoints = { start: 10, end: 290, A: null, B: null };

      const result = calculateSetPlaytime([track]);

      expect(result.cueBasedDuration).toBe(280);
    });

    it('should handle track with 0 second cue duration (start = end)', () => {
      const tracks = [
        createSetEntry('1', 300, { start: 100, end: 100 }), // 0s cue duration
      ];

      const result = calculateSetPlaytime(tracks);

      expect(result.totalDuration).toBe(300);
      expect(result.cueBasedDuration).toBe(300); // Falls back to full
    });

    it('should handle negative durations (not validated)', () => {
      const track = createSetEntry('1', -100); // Invalid but not validated

      const result = calculateSetPlaytime([track]);

      // Function doesn't validate, just adds the duration
      expect(result.totalDuration).toBe(-100);
      expect(result.formattedTotal).toBe('00:00:00'); // formatDuration handles negatives
    });

    it('should handle very small durations (< 1 second)', () => {
      const tracks = [createSetEntry('1', 0.5)];

      const result = calculateSetPlaytime(tracks);

      expect(result.formattedTotal).toBe('00:00:00'); // Floors to 0
    });
  });
});
