/**
 * SetPlaytimeStats component - Displays total set duration statistics
 * Shows both full duration and cue-based duration
 */

import type { PlaylistTrack } from '../stores/playlistStore';
import { calculateSetPlaytime } from '../utils/setPlaytime';

interface SetPlaytimeStatsProps {
  tracks: PlaylistTrack[];
}

export default function SetPlaytimeStats({ tracks }: SetPlaytimeStatsProps) {
  if (tracks.length === 0) {
    return null;
  }

  // Calculate stats on every render (fast operation, no need for memoization)
  const stats = calculateSetPlaytime(tracks);

  return (
    <div className="px-6 py-2 border-t border-gray-700 bg-gray-800 flex items-center gap-4 text-sm">
      <span className="flex items-center gap-2">
        <span className="text-gray-400">Full List:</span>
        <span
          className="text-primary-400 font-mono font-semibold cursor-help"
          title="Sum of all track lengths"
        >
          {stats.formattedTotal}
        </span>
      </span>
      <span className="text-gray-600">•</span>
      <span className="flex items-center gap-2">
        <span className="text-gray-400">Set Length:</span>
        <span
          className="text-purple-400 font-mono font-semibold cursor-help"
          title="Using Start→End cue points (falls back to full track duration)"
        >
          {stats.formattedCueBased}
        </span>
      </span>
    </div>
  );
}
