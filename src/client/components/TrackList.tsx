/**
 * TrackList component - Displays playlist tracks with real-time updates
 */

import { useState } from 'react';
import { usePlaylistStore } from '../stores/playlistStore';
import { removeTrack, updateTrackNote } from '../services/socket';

interface TrackListProps {
  roomId: string;
}

export default function TrackList({ roomId }: TrackListProps) {
  const tracks = usePlaylistStore((state) => state.tracks);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const handleRemove = (entryId: string) => {
    removeTrack(roomId, entryId);
  };

  const handleEditNote = (entryId: string, currentNote?: string | null) => {
    setEditingNote(entryId);
    setNoteValue(currentNote || '');
  };

  const handleSaveNote = (entryId: string) => {
    updateTrackNote(roomId, entryId, noteValue);
    setEditingNote(null);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteValue('');
  };

  if (tracks.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400 text-lg">No tracks in playlist yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Add your first track to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">
          Playlist ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
        </h2>
      </div>

      <div className="divide-y divide-gray-700">
        {tracks.map((entry) => (
          <div
            key={entry.id}
            className="px-6 py-4 hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Position */}
              <div className="flex-shrink-0 w-8 h-8 rounded bg-primary-600 flex items-center justify-center font-bold text-sm">
                {entry.position + 1}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {entry.track.title}
                </h3>
                <p className="text-gray-400 truncate">{entry.track.artist}</p>

                {/* Metadata */}
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  {entry.track.bpm && <span>{entry.track.bpm} BPM</span>}
                  {entry.track.key && <span>Key: {entry.track.key}</span>}
                  {entry.track.energy && (
                    <span>Energy: {entry.track.energy}/10</span>
                  )}
                </div>

                {/* Note Section */}
                <div className="mt-3">
                  {editingNote === entry.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteValue}
                        onChange={(e) => setNoteValue(e.target.value)}
                        placeholder="Add a note (e.g., transition point, cue)"
                        className="flex-1 bg-gray-900 text-gray-200 px-3 py-2 rounded border border-gray-600 focus:border-primary-500 focus:outline-none text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote(entry.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={() => handleSaveNote(entry.id)}
                        className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded text-sm font-medium transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      {entry.note ? (
                        <p className="text-sm text-gray-300 italic flex-1">
                          &quot;{entry.note}&quot;
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic flex-1">
                          No note
                        </p>
                      )}
                      <button
                        onClick={() => handleEditNote(entry.id, entry.note)}
                        className="text-primary-400 hover:text-primary-300 text-sm font-medium transition"
                      >
                        {entry.note ? 'Edit' : 'Add Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleRemove(entry.id)}
                  className="text-red-400 hover:text-red-300 px-3 py-2 rounded hover:bg-red-900/20 transition"
                  title="Remove track"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
