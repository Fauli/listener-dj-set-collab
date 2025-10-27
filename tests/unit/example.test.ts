import { describe, it, expect } from 'vitest';

/**
 * Example unit test
 * Run with: npm test
 */

describe('Example Test Suite', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});

// Example: Testing a utility function
function formatTrackTitle(artist: string, title: string): string {
  return `${artist} - ${title}`;
}

describe('formatTrackTitle', () => {
  it('should format track title correctly', () => {
    const result = formatTrackTitle('Artist Name', 'Track Title');
    expect(result).toBe('Artist Name - Track Title');
  });
});
