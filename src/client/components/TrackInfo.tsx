/**
 * TrackInfo - Displays track metadata (title, artist, BPM, key, energy)
 */

import type { PlaylistTrack } from '../stores/playlistStore';

interface TrackInfoProps {
  track: PlaylistTrack | null;
  isPlaying: boolean;
}

export default function TrackInfo({ track, isPlaying }: TrackInfoProps) {
  if (!track) {
    return (
      <div className="px-2 py-1.5 border-b border-gray-700">
        <p className="text-gray-500 text-xs">No track loaded</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1 border-b border-gray-700">
      <div className="flex items-center gap-2 text-xs">
        {/* Playing indicator */}
        {isPlaying && (
          <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse flex-shrink-0" />
        )}

        {/* Track info - all on one line */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-semibold text-white truncate">
            {track.track.title}
          </span>
          <span className="text-gray-400 truncate">
            - {track.track.artist}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 text-gray-500 flex-shrink-0">
          {track.track.bpm && (
            <span className="whitespace-nowrap">{track.track.bpm} BPM</span>
          )}
          {track.track.key && (
            <span className="whitespace-nowrap">| {track.track.key}</span>
          )}
          {track.track.energy && (
            <span className="whitespace-nowrap">| E{track.track.energy}</span>
          )}
        </div>
      </div>
    </div>
  );
}
