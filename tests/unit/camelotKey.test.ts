/**
 * Unit tests for Camelot Key Utilities
 * Tests harmonic key matching logic for DJ mixing
 */

import { describe, it, expect } from 'vitest';
import {
  parseCamelotKey,
  areKeysCompatible,
  getCompatibleKeys,
  getKeyRelationship,
} from '../../src/client/utils/camelotKey.js';

describe('Camelot Key Utilities', () => {
  describe('parseCamelotKey()', () => {
    it('should parse valid keys (1A through 12A)', () => {
      expect(parseCamelotKey('1A')).toEqual({ number: 1, letter: 'A' });
      expect(parseCamelotKey('8A')).toEqual({ number: 8, letter: 'A' });
      expect(parseCamelotKey('12A')).toEqual({ number: 12, letter: 'A' });
    });

    it('should parse valid keys (1B through 12B)', () => {
      expect(parseCamelotKey('1B')).toEqual({ number: 1, letter: 'B' });
      expect(parseCamelotKey('8B')).toEqual({ number: 8, letter: 'B' });
      expect(parseCamelotKey('12B')).toEqual({ number: 12, letter: 'B' });
    });

    it('should be case insensitive', () => {
      expect(parseCamelotKey('8a')).toEqual({ number: 8, letter: 'A' });
      expect(parseCamelotKey('8b')).toEqual({ number: 8, letter: 'B' });
      expect(parseCamelotKey('12a')).toEqual({ number: 12, letter: 'A' });
    });

    it('should trim whitespace', () => {
      expect(parseCamelotKey(' 8A ')).toEqual({ number: 8, letter: 'A' });
      expect(parseCamelotKey('  12B  ')).toEqual({ number: 12, letter: 'B' });
      expect(parseCamelotKey('\t5A\n')).toEqual({ number: 5, letter: 'A' });
    });

    it('should return null for invalid format', () => {
      expect(parseCamelotKey('13A')).toBeNull(); // Number out of range
      expect(parseCamelotKey('0A')).toBeNull(); // Number out of range
      expect(parseCamelotKey('1C')).toBeNull(); // Invalid letter
      expect(parseCamelotKey('A1')).toBeNull(); // Wrong order
      expect(parseCamelotKey('abc')).toBeNull(); // Completely invalid
      expect(parseCamelotKey('8')).toBeNull(); // Missing letter
      expect(parseCamelotKey('A')).toBeNull(); // Missing number
      expect(parseCamelotKey('')).toBeNull(); // Empty string
    });

    it('should return null for null/undefined', () => {
      expect(parseCamelotKey(null)).toBeNull();
      expect(parseCamelotKey(undefined)).toBeNull();
    });
  });

  describe('areKeysCompatible()', () => {
    describe('same key compatibility', () => {
      it('should return true for identical keys', () => {
        expect(areKeysCompatible('8A', '8A')).toBe(true);
        expect(areKeysCompatible('1B', '1B')).toBe(true);
        expect(areKeysCompatible('12A', '12A')).toBe(true);
      });

      it('should be case insensitive', () => {
        expect(areKeysCompatible('8A', '8a')).toBe(true);
        expect(areKeysCompatible('8a', '8A')).toBe(true);
      });
    });

    describe('adjacent key compatibility (±1, same letter)', () => {
      it('should return true for +1 number', () => {
        expect(areKeysCompatible('8A', '9A')).toBe(true);
        expect(areKeysCompatible('5B', '6B')).toBe(true);
      });

      it('should return true for -1 number', () => {
        expect(areKeysCompatible('8A', '7A')).toBe(true);
        expect(areKeysCompatible('6B', '5B')).toBe(true);
      });

      it('should handle wrapping at boundary (12 <-> 1)', () => {
        expect(areKeysCompatible('1A', '12A')).toBe(true);
        expect(areKeysCompatible('12A', '1A')).toBe(true);
        expect(areKeysCompatible('1B', '12B')).toBe(true);
        expect(areKeysCompatible('12B', '1B')).toBe(true);
      });
    });

    describe('relative key compatibility (same number, opposite letter)', () => {
      it('should return true for A/B swap', () => {
        expect(areKeysCompatible('8A', '8B')).toBe(true);
        expect(areKeysCompatible('8B', '8A')).toBe(true);
        expect(areKeysCompatible('1A', '1B')).toBe(true);
        expect(areKeysCompatible('12A', '12B')).toBe(true);
      });
    });

    describe('incompatible keys', () => {
      it('should return false for keys more than 1 apart', () => {
        expect(areKeysCompatible('8A', '10A')).toBe(false);
        expect(areKeysCompatible('8A', '6A')).toBe(false);
        expect(areKeysCompatible('1A', '3A')).toBe(false);
      });

      it('should return false for different letter and different number', () => {
        expect(areKeysCompatible('8A', '5B')).toBe(false);
        expect(areKeysCompatible('8A', '10B')).toBe(false);
        expect(areKeysCompatible('1A', '6B')).toBe(false);
      });

      it('should return false for adjacent number with different letter', () => {
        // These are NOT compatible - must have same letter for adjacent
        expect(areKeysCompatible('8A', '9B')).toBe(false);
        expect(areKeysCompatible('8A', '7B')).toBe(false);
      });
    });

    describe('null/undefined handling', () => {
      it('should return false for null/undefined inputs', () => {
        expect(areKeysCompatible(null, '8A')).toBe(false);
        expect(areKeysCompatible('8A', null)).toBe(false);
        expect(areKeysCompatible(null, null)).toBe(false);
        expect(areKeysCompatible(undefined, '8A')).toBe(false);
        expect(areKeysCompatible('8A', undefined)).toBe(false);
      });

      it('should return false for invalid keys', () => {
        expect(areKeysCompatible('8A', '13A')).toBe(false);
        expect(areKeysCompatible('8A', 'invalid')).toBe(false);
      });
    });
  });

  describe('getCompatibleKeys()', () => {
    it('should return 4 compatible keys for valid input', () => {
      const keys = getCompatibleKeys('8A');
      expect(keys).toHaveLength(4);
    });

    it('should include the original key', () => {
      const keys = getCompatibleKeys('8A');
      expect(keys).toContain('8A');
    });

    it('should include +1 and -1 (same letter)', () => {
      const keys = getCompatibleKeys('8A');
      expect(keys).toContain('9A'); // +1
      expect(keys).toContain('7A'); // -1
    });

    it('should include opposite letter (same number)', () => {
      const keys = getCompatibleKeys('8A');
      expect(keys).toContain('8B');

      const keysB = getCompatibleKeys('8B');
      expect(keysB).toContain('8A');
    });

    it('should handle wrapping at upper boundary (12)', () => {
      const keys = getCompatibleKeys('12A');
      expect(keys).toContain('12A'); // Same
      expect(keys).toContain('1A'); // 12 + 1 wraps to 1
      expect(keys).toContain('11A'); // 12 - 1
      expect(keys).toContain('12B'); // Opposite letter
    });

    it('should handle wrapping at lower boundary (1)', () => {
      const keys = getCompatibleKeys('1A');
      expect(keys).toContain('1A'); // Same
      expect(keys).toContain('2A'); // 1 + 1
      expect(keys).toContain('12A'); // 1 - 1 wraps to 12
      expect(keys).toContain('1B'); // Opposite letter
    });

    it('should work for B keys', () => {
      const keys = getCompatibleKeys('5B');
      expect(keys).toContain('5B'); // Same
      expect(keys).toContain('6B'); // +1
      expect(keys).toContain('4B'); // -1
      expect(keys).toContain('5A'); // Opposite
    });

    it('should return empty array for null/undefined', () => {
      expect(getCompatibleKeys(null)).toEqual([]);
      expect(getCompatibleKeys(undefined)).toEqual([]);
    });

    it('should return empty array for invalid key', () => {
      expect(getCompatibleKeys('13A')).toEqual([]);
      expect(getCompatibleKeys('invalid')).toEqual([]);
      expect(getCompatibleKeys('')).toEqual([]);
    });
  });

  describe('getKeyRelationship()', () => {
    describe('same key relationship', () => {
      it('should return "same" for identical keys', () => {
        expect(getKeyRelationship('8A', '8A')).toBe('same');
        expect(getKeyRelationship('12B', '12B')).toBe('same');
      });
    });

    describe('adjacent key relationship', () => {
      it('should return "adjacent" for ±1 with same letter', () => {
        expect(getKeyRelationship('8A', '9A')).toBe('adjacent');
        expect(getKeyRelationship('8A', '7A')).toBe('adjacent');
        expect(getKeyRelationship('5B', '6B')).toBe('adjacent');
        expect(getKeyRelationship('5B', '4B')).toBe('adjacent');
      });

      it('should return "adjacent" for wrapping boundaries', () => {
        expect(getKeyRelationship('1A', '12A')).toBe('adjacent');
        expect(getKeyRelationship('12A', '1A')).toBe('adjacent');
      });
    });

    describe('relative key relationship', () => {
      it('should return "relative" for same number, opposite letter', () => {
        expect(getKeyRelationship('8A', '8B')).toBe('relative');
        expect(getKeyRelationship('8B', '8A')).toBe('relative');
        expect(getKeyRelationship('1A', '1B')).toBe('relative');
        expect(getKeyRelationship('12A', '12B')).toBe('relative');
      });
    });

    describe('incompatible keys', () => {
      it('should return null for incompatible keys', () => {
        expect(getKeyRelationship('8A', '10A')).toBeNull();
        expect(getKeyRelationship('8A', '5B')).toBeNull();
        expect(getKeyRelationship('1A', '5A')).toBeNull();
      });

      it('should return null for null/undefined/invalid', () => {
        expect(getKeyRelationship(null, '8A')).toBeNull();
        expect(getKeyRelationship('8A', null)).toBeNull();
        expect(getKeyRelationship(undefined, '8A')).toBeNull();
        expect(getKeyRelationship('8A', 'invalid')).toBeNull();
      });
    });
  });

  describe('Edge cases and comprehensive scenarios', () => {
    it('should handle all boundary numbers correctly', () => {
      // Test all numbers 1-12 parse correctly
      for (let i = 1; i <= 12; i++) {
        expect(parseCamelotKey(`${i}A`)).toEqual({ number: i, letter: 'A' });
        expect(parseCamelotKey(`${i}B`)).toEqual({ number: i, letter: 'B' });
      }
    });

    it('should verify all compatible key combinations work', () => {
      // Key 6A should be compatible with: 6A, 5A, 7A, 6B
      const compatibleWith6A = ['6A', '5A', '7A', '6B'];
      for (const key of compatibleWith6A) {
        expect(areKeysCompatible('6A', key)).toBe(true);
      }

      // Key 6A should NOT be compatible with these
      const incompatibleWith6A = ['4A', '8A', '5B', '7B', '10A', '1B'];
      for (const key of incompatibleWith6A) {
        expect(areKeysCompatible('6A', key)).toBe(false);
      }
    });

    it('should maintain symmetry (if A compatible with B, then B compatible with A)', () => {
      const testPairs = [
        ['8A', '9A'],
        ['8A', '7A'],
        ['8A', '8B'],
        ['1A', '12A'],
        ['12B', '1B'],
      ];

      for (const [key1, key2] of testPairs) {
        expect(areKeysCompatible(key1, key2)).toBe(areKeysCompatible(key2, key1));
      }
    });
  });
});
