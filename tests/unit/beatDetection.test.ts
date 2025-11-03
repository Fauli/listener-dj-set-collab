/**
 * Unit tests for Beat Detection Utilities
 * Tests automatic BPM detection using mocked audio buffers
 */

import { describe, it, expect } from 'vitest';
import { detectBeats } from '../../src/client/utils/beatDetection.js';

/**
 * Create a mock AudioBuffer with synthetic audio data
 */
function createMockAudioBuffer(options: {
  sampleRate?: number;
  duration?: number; // In seconds
  bpm?: number; // If provided, generates regular beats at this BPM
  pattern?: 'regular' | 'silent' | 'irregular' | 'noisy';
}): AudioBuffer {
  const {
    sampleRate = 44100,
    duration = 10,
    bpm = 120,
    pattern = 'regular',
  } = options;

  const length = Math.floor(sampleRate * duration);
  const data = new Float32Array(length);

  switch (pattern) {
    case 'regular': {
      // Generate regular beats at specified BPM
      const beatInterval = (60 / bpm) * sampleRate; // Samples between beats
      for (let i = 0; i < length; i++) {
        // Create a beat (spike in amplitude) every beatInterval samples
        const distanceToNearestBeat = i % beatInterval;
        if (distanceToNearestBeat < sampleRate * 0.05) {
          // 50ms beat duration
          data[i] = 0.8 * (1 - distanceToNearestBeat / (sampleRate * 0.05));
        } else {
          data[i] = 0.1 * (Math.random() - 0.5); // Low background noise
        }
      }
      break;
    }

    case 'silent':
      // All zeros
      data.fill(0);
      break;

    case 'irregular': {
      // Random spikes at very irregular intervals (not rhythmic)
      let i = 0;
      while (i < length) {
        // Completely random intervals between 0.1 and 1.5 seconds
        const randomInterval = Math.floor(Math.random() * sampleRate * 1.4 + sampleRate * 0.1);
        i += randomInterval;
        if (i < length) {
          // Add a short spike
          for (let j = 0; j < sampleRate * 0.02 && i + j < length; j++) {
            data[i + j] = 0.7;
          }
        }
      }
      break;
    }

    case 'noisy':
      // Pure random noise
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() - 0.5;
      }
      break;
  }

  // Create mock AudioBuffer
  const mockBuffer = {
    sampleRate,
    length,
    duration,
    numberOfChannels: 1,
    getChannelData: (channel: number) => {
      if (channel !== 0) throw new Error('Mock only has 1 channel');
      return data;
    },
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as AudioBuffer;

  return mockBuffer;
}

describe('Beat Detection Utilities', () => {
  describe('detectBeats() - Basic functionality', () => {
    it('should detect beats in regular audio at 120 BPM', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer);

      expect(result).toBeDefined();
      expect(result.detectedBpm).toBeGreaterThan(110);
      expect(result.detectedBpm).toBeLessThan(130);
      expect(result.beats).toBeDefined();
      expect(result.beats.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.firstBeatTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect beats at different BPM (90 BPM)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 90, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer, { minBpm: 80, maxBpm: 100 });

      expect(result.detectedBpm).toBeGreaterThan(85);
      expect(result.detectedBpm).toBeLessThan(95);
    });

    it('should detect beats at different BPM (140 BPM)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 140, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer, { minBpm: 120, maxBpm: 160 });

      expect(result.detectedBpm).toBeGreaterThan(135);
      expect(result.detectedBpm).toBeLessThan(145);
    });

    it('should return at most 20 beats in result', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 30, pattern: 'regular' });
      const result = await detectBeats(buffer);

      expect(result.beats.length).toBeLessThanOrEqual(20);
    });
  });

  describe('detectBeats() - Edge cases', () => {
    it('should throw error for silent audio', async () => {
      const buffer = createMockAudioBuffer({ duration: 10, pattern: 'silent' });

      await expect(detectBeats(buffer)).rejects.toThrow(
        'Not enough beats detected'
      );
    });

    it('should throw error for very short audio (< 2 seconds)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 1, pattern: 'regular' });

      await expect(detectBeats(buffer)).rejects.toThrow();
    });

    it('should throw error for irregular beats', async () => {
      const buffer = createMockAudioBuffer({ duration: 10, pattern: 'irregular' });

      await expect(detectBeats(buffer)).rejects.toThrow(
        'Not enough regular beats found'
      );
    });

    it('should handle pure noise gracefully', async () => {
      const buffer = createMockAudioBuffer({ duration: 10, pattern: 'noisy' });

      // Should throw because no clear beats found
      await expect(detectBeats(buffer)).rejects.toThrow();
    });

    it('should handle very low sample rate', async () => {
      const buffer = createMockAudioBuffer({
        bpm: 120,
        duration: 10,
        pattern: 'regular',
        sampleRate: 8000, // Very low quality
      });

      // Should still work but maybe with lower confidence
      const result = await detectBeats(buffer, { minBpm: 100, maxBpm: 140 });
      expect(result).toBeDefined();
      expect(result.detectedBpm).toBeGreaterThan(0);
    });
  });

  describe('detectBeats() - Parameter validation', () => {
    it('should respect maxDuration parameter', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 30, pattern: 'regular' });

      // Analyze only first 5 seconds
      const result = await detectBeats(buffer, { maxDuration: 5 });

      // First beat should be early in the track
      expect(result.firstBeatTime).toBeLessThan(5);
    });

    it('should respect minBpm filter', async () => {
      const buffer = createMockAudioBuffer({ bpm: 70, duration: 15, pattern: 'regular' });

      // Set minBpm = 80, should have trouble detecting 70 BPM
      await expect(
        detectBeats(buffer, { minBpm: 80, maxBpm: 180 })
      ).rejects.toThrow('Not enough regular beats found');
    });

    it('should respect maxBpm filter', async () => {
      const buffer = createMockAudioBuffer({ bpm: 180, duration: 15, pattern: 'regular' });

      // Set maxBpm = 160, the algorithm may detect half-tempo (90 BPM)
      // This is expected behavior - beats at 180 BPM look like 90 BPM to the filter
      const result = await detectBeats(buffer, { minBpm: 80, maxBpm: 160 });

      // Should detect around 90 BPM (half of 180) since 180 exceeds maxBpm
      expect(result.detectedBpm).toBeGreaterThan(85);
      expect(result.detectedBpm).toBeLessThan(95);
    });

    it('should allow BPM within range', async () => {
      const buffer = createMockAudioBuffer({ bpm: 128, duration: 10, pattern: 'regular' });

      const result = await detectBeats(buffer, {
        minBpm: 120,
        maxBpm: 140,
      });

      expect(result.detectedBpm).toBeGreaterThan(120);
      expect(result.detectedBpm).toBeLessThan(140);
    });

    it('should handle higher sensitivity (detects more beats)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });

      const result = await detectBeats(buffer, { sensitivity: 0.9 });

      expect(result).toBeDefined();
      // Higher sensitivity might detect more peaks
    });

    it('should handle lower sensitivity (fewer false positives)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });

      const result = await detectBeats(buffer, { sensitivity: 0.3 });

      expect(result).toBeDefined();
      // Lower sensitivity should still work with clear beats
    });
  });

  describe('detectBeats() - Confidence calculation', () => {
    it('should have high confidence for regular beats', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer);

      // Regular beats should have high confidence
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should return confidence between 0 and 1', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('detectBeats() - Beat time validation', () => {
    it('should return beats in chronological order', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer);

      for (let i = 1; i < result.beats.length; i++) {
        expect(result.beats[i].time).toBeGreaterThan(result.beats[i - 1].time);
      }
    });

    it('should have firstBeatTime matching first beat in array', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer);

      expect(result.firstBeatTime).toBe(result.beats[0].time);
    });

    it('should have beat times within audio duration', async () => {
      const duration = 10;
      const buffer = createMockAudioBuffer({ bpm: 120, duration, pattern: 'regular' });
      const result = await detectBeats(buffer);

      for (const beat of result.beats) {
        expect(beat.time).toBeGreaterThanOrEqual(0);
        expect(beat.time).toBeLessThanOrEqual(duration);
      }
    });

    it('should have reasonable beat energy values', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer);

      for (const beat of result.beats) {
        expect(beat.energy).toBeGreaterThan(0);
        // Energy is not normalized to 1, but should be reasonable
        expect(beat.energy).toBeLessThan(10);
      }
    });
  });

  describe('detectBeats() - BPM range validation', () => {
    it('should detect slow tempo (80-90 BPM)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 85, duration: 15, pattern: 'regular' });
      const result = await detectBeats(buffer, { minBpm: 70, maxBpm: 100 });

      expect(result.detectedBpm).toBeGreaterThan(80);
      expect(result.detectedBpm).toBeLessThan(90);
    });

    it('should detect medium tempo (120-130 BPM)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 125, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer, { minBpm: 110, maxBpm: 140 });

      expect(result.detectedBpm).toBeGreaterThan(120);
      expect(result.detectedBpm).toBeLessThan(130);
    });

    it('should detect fast tempo (160-170 BPM)', async () => {
      const buffer = createMockAudioBuffer({ bpm: 165, duration: 10, pattern: 'regular' });
      const result = await detectBeats(buffer, { minBpm: 150, maxBpm: 180 });

      expect(result.detectedBpm).toBeGreaterThan(160);
      expect(result.detectedBpm).toBeLessThan(170);
    });
  });

  describe('detectBeats() - Multiple detection runs', () => {
    it('should return consistent results for same input', async () => {
      const buffer = createMockAudioBuffer({ bpm: 120, duration: 10, pattern: 'regular' });

      const result1 = await detectBeats(buffer);
      const result2 = await detectBeats(buffer);

      // Should be deterministic
      expect(result1.detectedBpm).toBe(result2.detectedBpm);
      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.firstBeatTime).toBe(result2.firstBeatTime);
      expect(result1.beats.length).toBe(result2.beats.length);
    });
  });
});
