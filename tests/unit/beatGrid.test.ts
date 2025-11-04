/**
 * Unit tests for beatGrid utilities
 * Tests beat grid calculations, quantization, and beat-sync alignment
 */

import { describe, it, expect } from 'vitest';
import {
  getBeatTime,
  getClosestBeat,
  quantizeToNearestBeat,
  getBeatsInRange,
  getCurrentBar,
  getBeatInBar,
  getBeatPhase,
  calculateAlignedPosition,
  type BeatGridParams,
} from '../../src/client/utils/beatGrid.js';

describe('beatGrid utilities', () => {
  describe('getBeatTime()', () => {
    it('should calculate time of beat 1 at firstBeatTime', () => {
      const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };
      expect(getBeatTime(1, params)).toBe(2.0);
    });

    it('should calculate time of beat 2 correctly (120 BPM)', () => {
      const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };
      // 120 BPM = 0.5 seconds per beat
      expect(getBeatTime(2, params)).toBe(2.5);
    });

    it('should calculate time of beat 5 correctly', () => {
      const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };
      // Beat 5 = 2.0 + (5-1) * 0.5 = 4.0
      expect(getBeatTime(5, params)).toBe(4.0);
    });

    it('should adjust for playback rate (faster)', () => {
      const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120, rate: 1.05 };
      // 120 BPM at 1.05x = 126 BPM = ~0.476 seconds per beat
      const beatTime = getBeatTime(2, params);
      expect(beatTime).toBeCloseTo(2.476, 2);
    });

    it('should adjust for playback rate (slower)', () => {
      const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120, rate: 0.95 };
      // 120 BPM at 0.95x = 114 BPM = ~0.526 seconds per beat
      const beatTime = getBeatTime(2, params);
      expect(beatTime).toBeCloseTo(2.526, 2);
    });

    it('should work with different BPM (90 BPM)', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 90 };
      // 90 BPM = 0.667 seconds per beat
      expect(getBeatTime(2, params)).toBeCloseTo(0.667, 2);
    });

    it('should work with high BPM (160 BPM)', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 160 };
      // 160 BPM = 0.375 seconds per beat
      expect(getBeatTime(2, params)).toBe(0.375);
    });

    it('should work with firstBeatTime at 0', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      expect(getBeatTime(1, params)).toBe(0);
      expect(getBeatTime(3, params)).toBe(1.0);
    });
  });

  describe('getClosestBeat()', () => {
    const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };

    it('should return beat 1 at firstBeatTime', () => {
      expect(getClosestBeat(2.0, params)).toBe(1);
    });

    it('should return beat 2 at 2.5 seconds', () => {
      expect(getClosestBeat(2.5, params)).toBe(2);
    });

    it('should round to nearest beat (closer to beat 2)', () => {
      expect(getClosestBeat(2.4, params)).toBe(2);
    });

    it('should round to nearest beat (closer to beat 1)', () => {
      expect(getClosestBeat(2.1, params)).toBe(1);
    });

    it('should return at least beat 1 for times before firstBeatTime', () => {
      expect(getClosestBeat(0.0, params)).toBe(1);
      expect(getClosestBeat(1.0, params)).toBe(1);
    });

    it('should work with far future times', () => {
      expect(getClosestBeat(10.0, params)).toBe(17); // (10-2)/0.5 + 1 ≈ 17
    });

    it('should handle rate adjustments', () => {
      const paramsWithRate: BeatGridParams = { firstBeatTime: 0, bpm: 120, rate: 1.05 };
      // Beat duration = 60/(120*1.05) ≈ 0.476
      expect(getClosestBeat(0.476, paramsWithRate)).toBe(2);
    });
  });

  describe('quantizeToNearestBeat()', () => {
    const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };

    it('should quantize to exact beat time', () => {
      expect(quantizeToNearestBeat(2.0, params)).toBe(2.0);
      expect(quantizeToNearestBeat(2.5, params)).toBe(2.5);
    });

    it('should quantize 2.3 to beat 2 (2.5)', () => {
      expect(quantizeToNearestBeat(2.3, params)).toBe(2.5);
    });

    it('should quantize 2.7 to beat 2 (2.5) - closer', () => {
      // 2.7 is 0.2s from beat 2 (2.5) and 0.3s from beat 3 (3.0)
      expect(quantizeToNearestBeat(2.7, params)).toBe(2.5);
    });

    it('should quantize times before firstBeatTime to beat 1', () => {
      expect(quantizeToNearestBeat(1.0, params)).toBe(2.0);
      expect(quantizeToNearestBeat(0.0, params)).toBe(2.0);
    });

    it('should work with different BPM', () => {
      const params90: BeatGridParams = { firstBeatTime: 0, bpm: 90 };
      // 90 BPM = 0.667s per beat
      expect(quantizeToNearestBeat(1.0, params90)).toBeCloseTo(1.333, 2); // Beat 3
    });
  });

  describe('getBeatsInRange()', () => {
    const params: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };

    it('should return beats in range [2.0, 4.0]', () => {
      const beats = getBeatsInRange(2.0, 4.0, params);
      // Beats at: 2.0, 2.5, 3.0, 3.5, 4.0
      expect(beats).toEqual([2.0, 2.5, 3.0, 3.5, 4.0]);
    });

    it('should return beats in range [2.2, 3.2]', () => {
      const beats = getBeatsInRange(2.2, 3.2, params);
      // Beats at: 2.5, 3.0
      expect(beats).toEqual([2.5, 3.0]);
    });

    it('should return empty array if range has no beats', () => {
      const beats = getBeatsInRange(0.0, 1.0, params);
      expect(beats).toEqual([]);
    });

    it('should return single beat if range is narrow', () => {
      const beats = getBeatsInRange(2.4, 2.6, params);
      expect(beats).toEqual([2.5]);
    });

    it('should work with firstBeatTime at 0', () => {
      const params0: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const beats = getBeatsInRange(0, 1.0, params0);
      // Beats at: 0.0, 0.5, 1.0
      expect(beats).toEqual([0.0, 0.5, 1.0]);
    });

    it('should handle many beats in long range', () => {
      const beats = getBeatsInRange(2.0, 12.0, params);
      expect(beats.length).toBe(21); // (12-2)/0.5 + 1 = 21 beats
      expect(beats[0]).toBe(2.0);
      expect(beats[beats.length - 1]).toBe(12.0);
    });

    it('should work with rate adjustment', () => {
      const paramsRate: BeatGridParams = { firstBeatTime: 0, bpm: 120, rate: 2.0 };
      // Double rate = 0.25s per beat
      const beats = getBeatsInRange(0, 1.0, paramsRate);
      expect(beats).toEqual([0.0, 0.25, 0.5, 0.75, 1.0]);
    });
  });

  describe('getCurrentBar()', () => {
    const params: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

    it('should return bar 1 for beats 1-4', () => {
      expect(getCurrentBar(0.0, params)).toBe(1); // Beat 1
      expect(getCurrentBar(0.5, params)).toBe(1); // Beat 2
      expect(getCurrentBar(1.0, params)).toBe(1); // Beat 3
      expect(getCurrentBar(1.5, params)).toBe(1); // Beat 4
    });

    it('should return bar 2 for beats 5-8', () => {
      expect(getCurrentBar(2.0, params)).toBe(2); // Beat 5
      expect(getCurrentBar(2.5, params)).toBe(2); // Beat 6
      expect(getCurrentBar(3.0, params)).toBe(2); // Beat 7
      expect(getCurrentBar(3.5, params)).toBe(2); // Beat 8
    });

    it('should return bar 3 for beats 9-12', () => {
      expect(getCurrentBar(4.0, params)).toBe(3); // Beat 9
    });

    it('should handle non-zero firstBeatTime', () => {
      const params2: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };
      expect(getCurrentBar(2.0, params2)).toBe(1); // Beat 1
      expect(getCurrentBar(3.5, params2)).toBe(1); // Beat 4
      expect(getCurrentBar(4.0, params2)).toBe(2); // Beat 5
    });
  });

  describe('getBeatInBar()', () => {
    const params: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

    it('should return 1-4 for first bar', () => {
      expect(getBeatInBar(0.0, params)).toBe(1); // Beat 1
      expect(getBeatInBar(0.5, params)).toBe(2); // Beat 2
      expect(getBeatInBar(1.0, params)).toBe(3); // Beat 3
      expect(getBeatInBar(1.5, params)).toBe(4); // Beat 4
    });

    it('should cycle back to 1 for beat 5', () => {
      expect(getBeatInBar(2.0, params)).toBe(1); // Beat 5 = 1 in bar
    });

    it('should return correct beat in second bar', () => {
      expect(getBeatInBar(2.0, params)).toBe(1); // Beat 5
      expect(getBeatInBar(2.5, params)).toBe(2); // Beat 6
      expect(getBeatInBar(3.0, params)).toBe(3); // Beat 7
      expect(getBeatInBar(3.5, params)).toBe(4); // Beat 8
    });

    it('should handle beat 9 (start of bar 3)', () => {
      expect(getBeatInBar(4.0, params)).toBe(1); // Beat 9
    });
  });

  describe('getBeatPhase()', () => {
    const params: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

    it('should return phase 0 at exact beat time', () => {
      const phase = getBeatPhase(0.0, params);
      expect(phase.beatNumber).toBe(1);
      expect(phase.phase).toBe(0);
    });

    it('should return phase 0.5 halfway through beat', () => {
      const phase = getBeatPhase(0.25, params); // Halfway through beat 1
      expect(phase.beatNumber).toBe(1);
      expect(phase.phase).toBe(0.5);
    });

    it('should return phase approaching 1 near end of beat', () => {
      const phase = getBeatPhase(0.49, params); // Almost at beat 2
      expect(phase.beatNumber).toBe(1);
      expect(phase.phase).toBeCloseTo(0.98, 1);
    });

    it('should work for beat 2', () => {
      const phase = getBeatPhase(0.5, params);
      expect(phase.beatNumber).toBe(2);
      expect(phase.phase).toBe(0);
    });

    it('should work for beat 2 with phase', () => {
      const phase = getBeatPhase(0.75, params); // Halfway through beat 2
      expect(phase.beatNumber).toBe(2);
      expect(phase.phase).toBe(0.5);
    });

    it('should handle times before firstBeatTime', () => {
      const params2: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };
      const phase = getBeatPhase(1.0, params2);
      expect(phase.beatNumber).toBe(1); // Clamped to min beat 1
      expect(phase.phase).toBeGreaterThanOrEqual(0);
    });

    it('should clamp phase to [0, 1] range', () => {
      const phase = getBeatPhase(10.0, params);
      expect(phase.phase).toBeGreaterThanOrEqual(0);
      expect(phase.phase).toBeLessThanOrEqual(1);
    });

    it('should work with rate adjustment', () => {
      const paramsRate: BeatGridParams = { firstBeatTime: 0, bpm: 120, rate: 1.5 };
      const phase = getBeatPhase(0.2, paramsRate); // 60/(120*1.5) = 0.333s per beat
      expect(phase.beatNumber).toBe(1);
      expect(phase.phase).toBeCloseTo(0.6, 1);
    });
  });

  describe('calculateAlignedPosition()', () => {
    it('should align tracks with same BPM at beat 1', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const targetParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

      const aligned = calculateAlignedPosition(0.0, sourceParams, targetParams);
      expect(aligned).toBe(0);
    });

    it('should align tracks with same BPM at beat 2', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const targetParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

      const aligned = calculateAlignedPosition(0.5, sourceParams, targetParams);
      expect(aligned).toBeCloseTo(0.5, 2);
    });

    it('should align tracks with different BPM (120 to 130)', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const targetParams: BeatGridParams = { firstBeatTime: 0, bpm: 130 };

      // Source at beat 2 (0.5s), target should also be at beat 2
      const aligned = calculateAlignedPosition(0.5, sourceParams, targetParams);
      // Target beat 2 at 130 BPM = 60/130 ≈ 0.462s
      expect(aligned).toBeCloseTo(0.462, 2);
    });

    it('should handle phase within beat', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const targetParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

      // Source at 0.25s (halfway through beat 1)
      const aligned = calculateAlignedPosition(0.25, sourceParams, targetParams);
      expect(aligned).toBeCloseTo(0.25, 2);
    });

    it('should align tracks with different firstBeatTime', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 2.0, bpm: 120 };
      const targetParams: BeatGridParams = { firstBeatTime: 0.5, bpm: 120 };

      // Source at firstBeatTime (beat 1) should map to target beat 1
      const aligned = calculateAlignedPosition(2.0, sourceParams, targetParams);
      expect(aligned).toBeCloseTo(0.5, 2);
    });

    it('should never return negative position', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 10.0, bpm: 120 };
      const targetParams: BeatGridParams = { firstBeatTime: 0, bpm: 120 };

      const aligned = calculateAlignedPosition(0.0, sourceParams, targetParams);
      expect(aligned).toBeGreaterThanOrEqual(0);
    });

    it('should handle rate differences between tracks', () => {
      const sourceParams: BeatGridParams = { firstBeatTime: 0, bpm: 120, rate: 1.05 };
      const targetParams: BeatGridParams = { firstBeatTime: 0, bpm: 120, rate: 0.95 };

      const aligned = calculateAlignedPosition(0.5, sourceParams, targetParams);
      expect(aligned).toBeGreaterThan(0);
      expect(aligned).toBeLessThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low BPM (60)', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 60 };
      expect(getBeatTime(2, params)).toBe(1.0); // 1 second per beat
      // 1.5 is equidistant from beat 2 (1.0) and beat 3 (2.0), rounds to beat 3
      expect(getClosestBeat(1.5, params)).toBe(3);
    });

    it('should handle very high BPM (180)', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 180 };
      expect(getBeatTime(2, params)).toBeCloseTo(0.333, 2);
      // 0.5s at 180 BPM (0.333s per beat) = beat 2.5, rounds to beat 3
      expect(getClosestBeat(0.5, params)).toBe(3);
    });

    it('should handle rate = 1.0 (default)', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const paramsWithRate: BeatGridParams = { firstBeatTime: 0, bpm: 120, rate: 1.0 };

      expect(getBeatTime(5, params)).toBe(getBeatTime(5, paramsWithRate));
    });

    it('should handle large beat numbers', () => {
      const params: BeatGridParams = { firstBeatTime: 0, bpm: 120 };
      const beatTime = getBeatTime(1000, params);
      expect(beatTime).toBeCloseTo(499.5, 1); // (1000-1) * 0.5
    });

    it('should handle fractional seconds precision', () => {
      const params: BeatGridParams = { firstBeatTime: 1.234, bpm: 127 };
      const beatTime = getBeatTime(5, params);
      expect(beatTime).toBeGreaterThan(1);
      expect(beatTime).toBeLessThan(10);
    });
  });
});
