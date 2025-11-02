/**
 * Camelot Key Utilities
 * Calculate harmonic compatibility between musical keys using the Camelot Wheel system
 */

export type CamelotKey = string; // e.g., "8A", "7B", "12A"

/**
 * Parse a Camelot key string into number and letter components
 * @param key - Camelot key (e.g., "8A", "12B")
 * @returns Object with number and letter, or null if invalid
 */
export function parseCamelotKey(key: string | null | undefined): { number: number; letter: 'A' | 'B' } | null {
  if (!key) return null;

  const match = key.trim().match(/^(\d{1,2})([AB])$/i);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  const letter = match[2].toUpperCase() as 'A' | 'B';

  // Validate number range (1-12)
  if (number < 1 || number > 12) return null;

  return { number, letter };
}

/**
 * Check if two Camelot keys are harmonically compatible
 * Compatible keys include:
 * - Same key (e.g., 8A = 8A)
 * - ±1 in number (e.g., 8A = 7A or 9A)
 * - A/B swap of same number (e.g., 8A = 8B)
 *
 * @param key1 - First Camelot key
 * @param key2 - Second Camelot key
 * @returns true if keys are compatible for mixing
 */
export function areKeysCompatible(key1: string | null | undefined, key2: string | null | undefined): boolean {
  const parsed1 = parseCamelotKey(key1);
  const parsed2 = parseCamelotKey(key2);

  if (!parsed1 || !parsed2) return false;

  // Same key
  if (parsed1.number === parsed2.number && parsed1.letter === parsed2.letter) {
    return true;
  }

  // Same letter, ±1 in number (wrapping 12 -> 1)
  if (parsed1.letter === parsed2.letter) {
    const diff = Math.abs(parsed1.number - parsed2.number);
    if (diff === 1 || diff === 11) { // 11 accounts for wrapping (1 and 12 are adjacent)
      return true;
    }
  }

  // Same number, opposite letter (A/B swap)
  if (parsed1.number === parsed2.number && parsed1.letter !== parsed2.letter) {
    return true;
  }

  return false;
}

/**
 * Get all compatible keys for a given Camelot key
 * @param key - Camelot key
 * @returns Array of compatible Camelot keys (including the original)
 */
export function getCompatibleKeys(key: string | null | undefined): string[] {
  const parsed = parseCamelotKey(key);
  if (!parsed) return [];

  const { number, letter } = parsed;
  const compatibleKeys: string[] = [];

  // Same key
  compatibleKeys.push(`${number}${letter}`);

  // +1 in number (wrapping at 12)
  const nextNumber = number === 12 ? 1 : number + 1;
  compatibleKeys.push(`${nextNumber}${letter}`);

  // -1 in number (wrapping at 1)
  const prevNumber = number === 1 ? 12 : number - 1;
  compatibleKeys.push(`${prevNumber}${letter}`);

  // Opposite letter, same number
  const oppositeLetter = letter === 'A' ? 'B' : 'A';
  compatibleKeys.push(`${number}${oppositeLetter}`);

  return compatibleKeys;
}

/**
 * Get the relationship type between two compatible keys
 * @param key1 - First Camelot key
 * @param key2 - Second Camelot key
 * @returns Relationship type or null if not compatible
 */
export function getKeyRelationship(
  key1: string | null | undefined,
  key2: string | null | undefined
): 'same' | 'adjacent' | 'relative' | null {
  if (!areKeysCompatible(key1, key2)) return null;

  const parsed1 = parseCamelotKey(key1);
  const parsed2 = parseCamelotKey(key2);

  if (!parsed1 || !parsed2) return null;

  // Same key
  if (parsed1.number === parsed2.number && parsed1.letter === parsed2.letter) {
    return 'same';
  }

  // Adjacent (±1 in number, same letter)
  if (parsed1.letter === parsed2.letter) {
    return 'adjacent';
  }

  // Relative (same number, opposite letter)
  if (parsed1.number === parsed2.number) {
    return 'relative';
  }

  return null;
}
