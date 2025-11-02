/**
 * Calculate set playtime statistics
 */

import type { SetEntry, Track, CuePoints } from '../../shared/types/index.js';

export interface PlaytimeCalculation {
  totalDuration: number;      // Sum of all track durations in seconds
  cueBasedDuration: number;   // Using Start→End cues, fallback to full duration
  formattedTotal: string;     // HH:MM:SS format
  formattedCueBased: string;  // HH:MM:SS format
}

/**
 * Calculate the total duration of a set in two ways:
 * 1. Total Duration: Sum of all track durations
 * 2. Cue-Based Duration: Using Start→End cue points when available, fallback to full track duration
 */
export function calculateSetPlaytime(
  tracks: (SetEntry & { track: Track })[]
): PlaytimeCalculation {
  let totalDuration = 0;
  let cueBasedDuration = 0;

  for (const entry of tracks) {
    const trackDuration = entry.track.duration || 0;

    // Always add to total duration
    totalDuration += trackDuration;

    // For cue-based duration, check if Start and End cue points are set
    if (entry.cuePoints && typeof entry.cuePoints === 'object') {
      const cuePoints = entry.cuePoints as CuePoints;

      // If both Start and End cue points are set, use the difference
      if (cuePoints.start !== null && cuePoints.end !== null) {
        const cueDuration = cuePoints.end - cuePoints.start;
        cueBasedDuration += cueDuration > 0 ? cueDuration : trackDuration;
      } else {
        // Fall back to full track duration if cue points aren't both set
        cueBasedDuration += trackDuration;
      }
    } else {
      // No cue points, use full track duration
      cueBasedDuration += trackDuration;
    }
  }

  return {
    totalDuration,
    cueBasedDuration,
    formattedTotal: formatDuration(totalDuration),
    formattedCueBased: formatDuration(cueBasedDuration),
  };
}

/**
 * Format duration in seconds to HH:MM:SS format
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '00:00:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':');
}
