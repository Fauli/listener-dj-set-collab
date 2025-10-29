/**
 * Zustand store for playlist state management
 * Handles real-time playlist updates with optimistic UI
 */

import { create } from 'zustand';
import type { SetEntry, Track } from '../../shared/types/index.js';

export interface PlaylistTrack extends SetEntry {
  track: Track;
}

interface PlaylistStore {
  // State
  tracks: PlaylistTrack[];
  loading: boolean;
  error: string | null;

  // Pending actions for optimistic updates
  pendingActions: Set<string>;

  // Actions
  setTracks: (tracks: PlaylistTrack[]) => void;
  addTrack: (track: PlaylistTrack) => void;
  removeTrack: (entryId: string) => void;
  updateTrack: (entryId: string, updates: Partial<PlaylistTrack>) => void;
  reorderTrack: (entryId: string, newPosition: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Optimistic update helpers
  addPendingAction: (actionId: string) => void;
  removePendingAction: (actionId: string) => void;
  isPending: (actionId: string) => boolean;

  // Reset store
  reset: () => void;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  // Initial state
  tracks: [],
  loading: false,
  error: null,
  pendingActions: new Set(),

  // Set complete track list (e.g., from initial room state)
  setTracks: (tracks) => {
    set({
      tracks: tracks.sort((a, b) => a.position - b.position),
      error: null
    });
  },

  // Add a track to the playlist
  addTrack: (track) => {
    set((state) => {
      // Insert track at correct position and resort
      const newTracks = [...state.tracks, track].sort((a, b) => a.position - b.position);
      return {
        tracks: newTracks,
        error: null
      };
    });
  },

  // Remove a track from the playlist
  removeTrack: (entryId) => {
    set((state) => ({
      tracks: state.tracks
        .filter((t) => t.id !== entryId)
        // Adjust positions after removal
        .map((t, index) => ({ ...t, position: index })),
      error: null,
    }));
  },

  // Update track (e.g., change note)
  updateTrack: (entryId, updates) => {
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === entryId ? { ...t, ...updates } : t
      ),
      error: null,
    }));
  },

  // Reorder track (drag & drop)
  reorderTrack: (entryId, newPosition) => {
    set((state) => {
      const trackIndex = state.tracks.findIndex((t) => t.id === entryId);
      if (trackIndex === -1) return state;

      const track = state.tracks[trackIndex];
      const oldPosition = track.position;

      if (oldPosition === newPosition) return state;

      // Create new array and move track
      const newTracks = [...state.tracks];
      newTracks.splice(trackIndex, 1);

      // Find insertion index based on position
      const insertIndex = newTracks.findIndex((t) => t.position >= newPosition);
      const finalIndex = insertIndex === -1 ? newTracks.length : insertIndex;

      newTracks.splice(finalIndex, 0, { ...track, position: newPosition });

      // Recalculate all positions
      const reindexed = newTracks
        .sort((a, b) => a.position - b.position)
        .map((t, index) => ({ ...t, position: index }));

      return { tracks: reindexed, error: null };
    });
  },

  // Loading state
  setLoading: (loading) => set({ loading }),

  // Error state
  setError: (error) => set({ error }),

  // Optimistic update management
  addPendingAction: (actionId) => {
    set((state) => {
      const newPending = new Set(state.pendingActions);
      newPending.add(actionId);
      return { pendingActions: newPending };
    });
  },

  removePendingAction: (actionId) => {
    set((state) => {
      const newPending = new Set(state.pendingActions);
      newPending.delete(actionId);
      return { pendingActions: newPending };
    });
  },

  isPending: (actionId) => {
    return get().pendingActions.has(actionId);
  },

  // Reset store (on leaving room)
  reset: () => {
    set({
      tracks: [],
      loading: false,
      error: null,
      pendingActions: new Set(),
    });
  },
}));
