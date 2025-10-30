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
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No track loaded</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-gray-700">
      {/* Always reserve space for "NOW PLAYING" to prevent layout shift */}
      <div
        className={`flex items-center gap-2 text-primary-400 text-xs font-medium mb-1 transition-opacity duration-200 ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ height: '16px' }} // Fixed height to prevent shift
      >
        <svg
          className="w-3 h-3 animate-pulse"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
        NOW PLAYING
      </div>

      <h3 className="font-semibold text-base text-white truncate">
        {track.track.title}
      </h3>

      <p className="text-sm text-gray-400 truncate mt-0.5">
        {track.track.artist}
      </p>

      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        {track.track.bpm && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {track.track.bpm} BPM
          </span>
        )}
        {track.track.key && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            {track.track.key}
          </span>
        )}
        {track.track.energy && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            E{track.track.energy}
          </span>
        )}
      </div>
    </div>
  );
}
