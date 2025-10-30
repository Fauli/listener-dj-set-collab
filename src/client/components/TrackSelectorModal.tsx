/**
 * TrackSelectorModal - Modal for selecting a track from the playlist to load into a deck
 */

import { useState } from 'react';
import { usePlaylistStore, type PlaylistTrack } from '../stores/playlistStore';

interface TrackSelectorModalProps {
  isOpen: boolean;
  deckId: 'A' | 'B';
  onClose: () => void;
  onSelectTrack: (track: PlaylistTrack) => void;
}

export default function TrackSelectorModal({
  isOpen,
  deckId,
  onClose,
  onSelectTrack,
}: TrackSelectorModalProps) {
  const tracks = usePlaylistStore((state) => state.tracks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter tracks by search query
  const filteredTracks = tracks.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.track.title.toLowerCase().includes(query) ||
      entry.track.artist.toLowerCase().includes(query) ||
      (entry.track.bpm && entry.track.bpm.toString().includes(query)) ||
      (entry.track.key && entry.track.key.toLowerCase().includes(query))
    );
  });

  const handleSelect = () => {
    const track = tracks.find((t) => t.id === selectedTrackId);
    if (track) {
      onSelectTrack(track);
      onClose();
      setSelectedTrackId(null);
      setSearchQuery('');
    }
  };

  const handleCancel = () => {
    onClose();
    setSelectedTrackId(null);
    setSearchQuery('');
  };

  const accentColor = deckId === 'A' ? 'primary' : 'purple';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-gray-700 ${
            accentColor === 'primary' ? 'bg-primary-900/20' : 'bg-purple-900/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Load Track into Deck {deckId}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-300 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tracks by title, artist, BPM, or key..."
              className="w-full bg-gray-900 text-gray-200 px-4 py-2 pl-10 rounded border border-gray-700 focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            <svg
              className="w-5 h-5 text-gray-500 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTracks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'No tracks found matching your search.' : 'No tracks in playlist yet.'}
            </div>
          ) : (
            filteredTracks.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedTrackId(entry.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all border ${
                  selectedTrackId === entry.id
                    ? accentColor === 'primary'
                      ? 'bg-primary-900/40 border-primary-600'
                      : 'bg-purple-900/40 border-purple-600'
                    : 'bg-gray-900/50 border-transparent hover:bg-gray-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Radio Button */}
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedTrackId === entry.id
                          ? accentColor === 'primary'
                            ? 'border-primary-600'
                            : 'border-purple-600'
                          : 'border-gray-600'
                      }`}
                    >
                      {selectedTrackId === entry.id && (
                        <div
                          className={`w-3 h-3 rounded-full ${
                            accentColor === 'primary' ? 'bg-primary-600' : 'bg-purple-600'
                          }`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-gray-500 font-mono">#{entry.position + 1}</span>
                      <h3 className="font-semibold text-base truncate">{entry.track.title}</h3>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{entry.track.artist}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {entry.track.bpm && <span>{entry.track.bpm} BPM</span>}
                      {entry.track.key && <span>• {entry.track.key}</span>}
                      {entry.track.energy && <span>• E{entry.track.energy}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 rounded font-medium bg-gray-700 hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedTrackId}
            className={`flex-1 px-6 py-3 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
              accentColor === 'primary'
                ? 'bg-primary-600 hover:bg-primary-700 disabled:hover:bg-primary-600'
                : 'bg-purple-600 hover:bg-purple-700 disabled:hover:bg-purple-600'
            }`}
          >
            Load Track
          </button>
        </div>
      </div>
    </div>
  );
}
