/**
 * TrackList component - Displays playlist tracks with real-time updates
 * Supports drag & drop reordering
 */

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlaylistStore, type PlaylistTrack } from '../stores/playlistStore';
import { useDeckStore } from '../stores/deckStore';
import { removeTrack, updateTrackNote, reorderTrack } from '../services/socket';
import { areKeysCompatible, getKeyRelationship } from '../utils/camelotKey';
import SetPlaytimeStats from './SetPlaytimeStats';

interface TrackListProps {
  roomId: string;
  onLoadToDeck?: (deckId: 'A' | 'B', track: PlaylistTrack) => void;
}

/**
 * SortableTrackItem - Individual draggable track item
 */
function SortableTrackItem({
  entry,
  roomId,
  isEditingNote,
  noteValue,
  onEditNote,
  onSaveNote,
  onCancelEdit,
  onUpdateNoteValue,
  onRemove,
  onLoadToDeck,
  compatibleWithDeckA,
  compatibleWithDeckB,
  relationshipA,
  relationshipB,
}: {
  entry: PlaylistTrack;
  roomId: string;
  isEditingNote: boolean;
  noteValue: string;
  onEditNote: (currentNote?: string | null) => void;
  onSaveNote: () => void;
  onCancelEdit: () => void;
  onUpdateNoteValue: (value: string) => void;
  onRemove: () => void;
  onLoadToDeck?: (deckId: 'A' | 'B', track: PlaylistTrack) => void;
  compatibleWithDeckA?: boolean;
  compatibleWithDeckB?: boolean;
  relationshipA?: 'same' | 'adjacent' | 'relative' | null;
  relationshipB?: 'same' | 'adjacent' | 'relative' | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine border color based on key compatibility
  let borderClass = '';
  if (compatibleWithDeckA && compatibleWithDeckB) {
    // Compatible with both - show gradient or prioritize Deck A
    borderClass = 'border-l-4 border-l-primary-500';
  } else if (compatibleWithDeckA) {
    borderClass = 'border-l-4 border-l-primary-500';
  } else if (compatibleWithDeckB) {
    borderClass = 'border-l-4 border-l-purple-500';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-3 sm:px-6 py-3 sm:py-2 hover:bg-gray-750 transition-colors group bg-gray-800 ${borderClass}`}
      data-track-item
      role="listitem"
      aria-label={`Track ${entry.position + 1}: ${entry.track.title} by ${entry.track.artist}`}
    >
      <div className="flex items-start sm:items-center gap-2 sm:gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 transition touch-manipulation p-1"
          aria-label="Drag to reorder"
        >
          <svg
            className="w-5 h-5 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>

        {/* Position */}
        <div className="flex-shrink-0 w-8 h-8 sm:w-7 sm:h-7 rounded bg-primary-600 flex items-center justify-center font-bold text-xs">
          {entry.position + 1}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2">
            <h3 className="font-semibold text-sm sm:text-base truncate">
              {entry.track.title}
            </h3>
            {/* Metadata inline with title on desktop, below on mobile */}
            <div className="flex flex-wrap gap-1 sm:gap-2 text-xs text-gray-500 items-center">
              {entry.track.bpm && <span>{entry.track.bpm} BPM</span>}
              {entry.track.key && (
                <span className="flex items-center gap-1">
                  {entry.track.bpm && '•'} {entry.track.key}
                  {/* Compatibility indicators */}
                  {compatibleWithDeckA && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500" title="Compatible with Deck A"></span>
                  )}
                  {compatibleWithDeckB && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" title="Compatible with Deck B"></span>
                  )}
                </span>
              )}
              {entry.track.energy && <span>• E{entry.track.energy}</span>}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 truncate">{entry.track.artist}</p>

          {/* Note Section */}
          {isEditingNote ? (
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={noteValue}
                onChange={(e) => onUpdateNoteValue(e.target.value)}
                placeholder="Add a note (e.g., transition point, cue)"
                className="flex-1 bg-gray-900 text-gray-200 px-2 py-1 rounded border border-gray-600 focus:border-primary-500 focus:outline-none text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveNote();
                  if (e.key === 'Escape') onCancelEdit();
                }}
              />
              <button
                onClick={onSaveNote}
                className="bg-primary-600 hover:bg-primary-700 px-3 py-1 rounded text-sm font-medium transition"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm font-medium transition"
              >
                Cancel
              </button>
            </div>
          ) : entry.note ? (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-gray-300 italic flex-1">
                &quot;{entry.note}&quot;
              </p>
              <button
                onClick={() => onEditNote(entry.note)}
                className="text-primary-400 hover:text-primary-300 text-xs font-medium transition opacity-0 group-hover:opacity-100"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={() => onEditNote(null)}
              className="text-primary-400 hover:text-primary-300 text-xs font-medium transition opacity-0 group-hover:opacity-100 mt-1"
            >
              + Add note
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-2">
          {/* Load to Deck Buttons */}
          {onLoadToDeck && (
            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadToDeck('A', entry);
                }}
                className="px-2 sm:px-2 py-1.5 sm:py-1 rounded bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 hover:text-primary-300 transition text-xs font-medium touch-manipulation"
                aria-label={`Load ${entry.track.title} to Deck A`}
                title="Load to Deck A"
              >
                ▶ A
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadToDeck('B', entry);
                }}
                className="px-2 sm:px-2 py-1.5 sm:py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 hover:text-purple-300 transition text-xs font-medium touch-manipulation"
                aria-label={`Load ${entry.track.title} to Deck B`}
                title="Load to Deck B"
              >
                ▶ B
              </button>
            </div>
          )}

          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 px-2 py-1.5 sm:py-1 rounded hover:bg-red-900/20 transition touch-manipulation"
            aria-label={`Remove ${entry.track.title} from playlist`}
            title="Remove track"
          >
            <svg
              className="w-5 h-5 sm:w-4 sm:h-4"
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
  );
}

export default function TrackList({ roomId, onLoadToDeck }: TrackListProps) {
  const tracks = usePlaylistStore((state) => state.tracks);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  // Get currently loaded deck tracks for key compatibility checking
  const deckA = useDeckStore((state) => state.deckA);
  const deckB = useDeckStore((state) => state.deckB);
  const deckAKey = deckA.track?.track.key;
  const deckBKey = deckB.track?.track.key;

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = tracks.findIndex((t) => t.id === active.id);
    const newIndex = tracks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Emit WebSocket event for server sync
    // Server will broadcast the updated playlist to all clients
    reorderTrack(roomId, active.id as string, newIndex);
  };

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
      <div className="bg-gray-800 rounded-lg p-12 text-center">
        <svg
          className="w-20 h-20 text-gray-600 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">No Tracks Yet</h3>
        <p className="text-gray-500 mb-4">
          Upload your first track to start building your DJ set
        </p>
        <p className="text-sm text-gray-600">
          Click "Upload Tracks" above to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden" role="region" aria-label="Playlist">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-xl font-bold" id="playlist-heading">
          Playlist ({tracks.length} track{tracks.length !== 1 ? 's' : ''})
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Drag tracks to reorder
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tracks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-gray-700" role="list" aria-labelledby="playlist-heading">
            {tracks.map((entry) => {
              // Calculate key compatibility
              const compatibleWithDeckA = deckAKey ? areKeysCompatible(entry.track.key, deckAKey) : false;
              const compatibleWithDeckB = deckBKey ? areKeysCompatible(entry.track.key, deckBKey) : false;
              const relationshipA = deckAKey ? getKeyRelationship(entry.track.key, deckAKey) : null;
              const relationshipB = deckBKey ? getKeyRelationship(entry.track.key, deckBKey) : null;

              return (
                <SortableTrackItem
                  key={entry.id}
                  entry={entry}
                  roomId={roomId}
                  isEditingNote={editingNote === entry.id}
                  noteValue={noteValue}
                  onEditNote={(currentNote) => handleEditNote(entry.id, currentNote)}
                  onSaveNote={() => handleSaveNote(entry.id)}
                  onCancelEdit={handleCancelEdit}
                  onUpdateNoteValue={setNoteValue}
                  onRemove={() => handleRemove(entry.id)}
                  onLoadToDeck={onLoadToDeck}
                  compatibleWithDeckA={compatibleWithDeckA}
                  compatibleWithDeckB={compatibleWithDeckB}
                  relationshipA={relationshipA}
                  relationshipB={relationshipB}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <SetPlaytimeStats tracks={tracks} />
    </div>
  );
}
