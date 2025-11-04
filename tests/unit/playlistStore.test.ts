/**
 * Unit tests for playlistStore
 * Tests state management, track operations, and optimistic updates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaylistStore } from '../../src/client/stores/playlistStore.js';
import type { PlaylistTrack } from '../../src/client/stores/playlistStore.js';

// Helper to create mock tracks
function createMockTrack(id: string, position: number, title: string = 'Test Track'): PlaylistTrack {
  return {
    id,
    roomId: 'test-room',
    trackId: `track-${id}`,
    position,
    note: null,
    cueIn: null,
    cueOut: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    track: {
      id: `track-${id}`,
      title,
      artist: 'Test Artist',
      bpm: 120,
      key: '8A',
      duration: 180,
      filePath: `/path/to/${id}.mp3`,
      uploadedBy: 'test-user',
      uploadedAt: new Date(),
    },
  };
}

describe('playlistStore', () => {
  beforeEach(() => {
    // Reset store before each test
    usePlaylistStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = usePlaylistStore.getState();

      expect(state.tracks).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.pendingActions.size).toBe(0);
    });
  });

  describe('setTracks()', () => {
    it('should set tracks and sort by position', () => {
      const tracks = [
        createMockTrack('3', 2, 'Track 3'),
        createMockTrack('1', 0, 'Track 1'),
        createMockTrack('2', 1, 'Track 2'),
      ];

      usePlaylistStore.getState().setTracks(tracks);
      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(3);
      expect(state.tracks[0].track.title).toBe('Track 1');
      expect(state.tracks[1].track.title).toBe('Track 2');
      expect(state.tracks[2].track.title).toBe('Track 3');
      expect(state.error).toBeNull();
    });

    it('should handle empty array', () => {
      usePlaylistStore.getState().setTracks([]);
      const state = usePlaylistStore.getState();

      expect(state.tracks).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('should clear previous error when setting tracks', () => {
      usePlaylistStore.getState().setError('Previous error');
      usePlaylistStore.getState().setTracks([createMockTrack('1', 0)]);

      const state = usePlaylistStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('addTrack()', () => {
    it('should add a single track', () => {
      const track = createMockTrack('1', 0, 'First Track');

      usePlaylistStore.getState().addTrack(track);
      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(1);
      expect(state.tracks[0].id).toBe('1');
      expect(state.error).toBeNull();
    });

    it('should add multiple tracks in correct order', () => {
      usePlaylistStore.getState().addTrack(createMockTrack('1', 0, 'Track 1'));
      usePlaylistStore.getState().addTrack(createMockTrack('2', 1, 'Track 2'));
      usePlaylistStore.getState().addTrack(createMockTrack('3', 2, 'Track 3'));

      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(3);
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].position).toBe(1);
      expect(state.tracks[2].position).toBe(2);
    });

    it('should maintain sort order when adding out of sequence', () => {
      usePlaylistStore.getState().addTrack(createMockTrack('2', 2, 'Track 2'));
      usePlaylistStore.getState().addTrack(createMockTrack('1', 0, 'Track 1'));
      usePlaylistStore.getState().addTrack(createMockTrack('3', 1, 'Track 3'));

      const state = usePlaylistStore.getState();

      expect(state.tracks[0].track.title).toBe('Track 1');
      expect(state.tracks[1].track.title).toBe('Track 3');
      expect(state.tracks[2].track.title).toBe('Track 2');
    });

    it('should clear error when adding track', () => {
      usePlaylistStore.getState().setError('Previous error');
      usePlaylistStore.getState().addTrack(createMockTrack('1', 0));

      expect(usePlaylistStore.getState().error).toBeNull();
    });
  });

  describe('removeTrack()', () => {
    beforeEach(() => {
      const tracks = [
        createMockTrack('1', 0, 'Track 1'),
        createMockTrack('2', 1, 'Track 2'),
        createMockTrack('3', 2, 'Track 3'),
      ];
      usePlaylistStore.getState().setTracks(tracks);
    });

    it('should remove track and reindex positions', () => {
      usePlaylistStore.getState().removeTrack('2');
      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(2);
      expect(state.tracks[0].id).toBe('1');
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].id).toBe('3');
      expect(state.tracks[1].position).toBe(1); // Reindexed from 2 to 1
    });

    it('should remove first track correctly', () => {
      usePlaylistStore.getState().removeTrack('1');
      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(2);
      expect(state.tracks[0].id).toBe('2');
      expect(state.tracks[0].position).toBe(0); // Reindexed from 1 to 0
      expect(state.tracks[1].id).toBe('3');
      expect(state.tracks[1].position).toBe(1); // Reindexed from 2 to 1
    });

    it('should remove last track correctly', () => {
      usePlaylistStore.getState().removeTrack('3');
      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(2);
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].position).toBe(1);
    });

    it('should handle removing non-existent track', () => {
      usePlaylistStore.getState().removeTrack('non-existent');
      const state = usePlaylistStore.getState();

      expect(state.tracks).toHaveLength(3); // No change
    });

    it('should clear error when removing track', () => {
      usePlaylistStore.getState().setError('Previous error');
      usePlaylistStore.getState().removeTrack('2');

      expect(usePlaylistStore.getState().error).toBeNull();
    });
  });

  describe('updateTrack()', () => {
    beforeEach(() => {
      const tracks = [
        createMockTrack('1', 0, 'Track 1'),
        createMockTrack('2', 1, 'Track 2'),
      ];
      usePlaylistStore.getState().setTracks(tracks);
    });

    it('should update track note', () => {
      usePlaylistStore.getState().updateTrack('1', { note: 'Great opener!' });
      const state = usePlaylistStore.getState();

      expect(state.tracks[0].note).toBe('Great opener!');
    });

    it('should update cue points', () => {
      usePlaylistStore.getState().updateTrack('1', { cueIn: 10.5, cueOut: 150.0 });
      const state = usePlaylistStore.getState();

      expect(state.tracks[0].cueIn).toBe(10.5);
      expect(state.tracks[0].cueOut).toBe(150.0);
    });

    it('should update multiple fields at once', () => {
      usePlaylistStore.getState().updateTrack('2', {
        note: 'Build energy',
        cueIn: 5.0,
        cueOut: 120.0,
      });
      const state = usePlaylistStore.getState();

      expect(state.tracks[1].note).toBe('Build energy');
      expect(state.tracks[1].cueIn).toBe(5.0);
      expect(state.tracks[1].cueOut).toBe(120.0);
    });

    it('should not affect other tracks', () => {
      usePlaylistStore.getState().updateTrack('1', { note: 'Updated' });
      const state = usePlaylistStore.getState();

      expect(state.tracks[0].note).toBe('Updated');
      expect(state.tracks[1].note).toBeNull(); // Unchanged
    });

    it('should handle updating non-existent track gracefully', () => {
      usePlaylistStore.getState().updateTrack('non-existent', { note: 'Test' });
      const state = usePlaylistStore.getState();

      // Should not crash, just no-op
      expect(state.tracks).toHaveLength(2);
    });

    it('should clear error when updating track', () => {
      usePlaylistStore.getState().setError('Previous error');
      usePlaylistStore.getState().updateTrack('1', { note: 'Updated' });

      expect(usePlaylistStore.getState().error).toBeNull();
    });
  });

  describe('reorderTrack()', () => {
    beforeEach(() => {
      const tracks = [
        createMockTrack('1', 0, 'Track 1'),
        createMockTrack('2', 1, 'Track 2'),
        createMockTrack('3', 2, 'Track 3'),
        createMockTrack('4', 3, 'Track 4'),
      ];
      usePlaylistStore.getState().setTracks(tracks);
    });

    it('should move track down (position 0 → 2)', () => {
      usePlaylistStore.getState().reorderTrack('1', 2);
      const state = usePlaylistStore.getState();

      // When moving down, track is inserted before existing track at target position
      // After reindexing: [2, 1, 3, 4] becomes [2(0), 1(1), 3(2), 4(3)]
      expect(state.tracks[0].id).toBe('2');
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].id).toBe('1');
      expect(state.tracks[1].position).toBe(1);
      expect(state.tracks[2].id).toBe('3');
      expect(state.tracks[2].position).toBe(2);
      expect(state.tracks[3].id).toBe('4');
      expect(state.tracks[3].position).toBe(3);
    });

    it('should move track up (position 3 → 1)', () => {
      usePlaylistStore.getState().reorderTrack('4', 1);
      const state = usePlaylistStore.getState();

      expect(state.tracks[0].id).toBe('1');
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].id).toBe('4');
      expect(state.tracks[1].position).toBe(1);
      expect(state.tracks[2].id).toBe('2');
      expect(state.tracks[2].position).toBe(2);
      expect(state.tracks[3].id).toBe('3');
      expect(state.tracks[3].position).toBe(3);
    });

    it('should move to first position', () => {
      usePlaylistStore.getState().reorderTrack('3', 0);
      const state = usePlaylistStore.getState();

      expect(state.tracks[0].id).toBe('3');
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].id).toBe('1');
      expect(state.tracks[2].id).toBe('2');
    });

    it('should move to last position', () => {
      usePlaylistStore.getState().reorderTrack('2', 3);
      const state = usePlaylistStore.getState();

      // When moving to last position, track is inserted before existing track at position 3
      // After reindexing: [1, 3, 2, 4] becomes [1(0), 3(1), 2(2), 4(3)]
      expect(state.tracks[2].id).toBe('2');
      expect(state.tracks[2].position).toBe(2);
      expect(state.tracks[3].id).toBe('4');
      expect(state.tracks[3].position).toBe(3);
    });

    it('should handle same position (no-op)', () => {
      usePlaylistStore.getState().reorderTrack('2', 1);
      const state = usePlaylistStore.getState();

      // Should remain unchanged
      expect(state.tracks[0].id).toBe('1');
      expect(state.tracks[1].id).toBe('2');
      expect(state.tracks[2].id).toBe('3');
      expect(state.tracks[3].id).toBe('4');
    });

    it('should handle non-existent track (no-op)', () => {
      usePlaylistStore.getState().reorderTrack('non-existent', 2);
      const state = usePlaylistStore.getState();

      // Should remain unchanged
      expect(state.tracks).toHaveLength(4);
      expect(state.tracks[0].id).toBe('1');
    });

    it('should ensure no position gaps after reorder', () => {
      usePlaylistStore.getState().reorderTrack('1', 2);
      const state = usePlaylistStore.getState();

      // All positions should be sequential: 0, 1, 2, 3
      state.tracks.forEach((track, index) => {
        expect(track.position).toBe(index);
      });
    });

    it('should clear error when reordering track', () => {
      usePlaylistStore.getState().setError('Previous error');
      usePlaylistStore.getState().reorderTrack('1', 2);

      expect(usePlaylistStore.getState().error).toBeNull();
    });
  });

  describe('Position Integrity', () => {
    it('should maintain sequential positions after multiple operations', () => {
      // Add tracks
      usePlaylistStore.getState().addTrack(createMockTrack('1', 0));
      usePlaylistStore.getState().addTrack(createMockTrack('2', 1));
      usePlaylistStore.getState().addTrack(createMockTrack('3', 2));

      // Remove middle track
      usePlaylistStore.getState().removeTrack('2');

      // Reorder
      usePlaylistStore.getState().reorderTrack('3', 0);

      const state = usePlaylistStore.getState();

      // Should have positions 0, 1 with no gaps
      expect(state.tracks).toHaveLength(2);
      expect(state.tracks[0].position).toBe(0);
      expect(state.tracks[1].position).toBe(1);
    });
  });

  describe('Loading State', () => {
    it('should set loading to true', () => {
      usePlaylistStore.getState().setLoading(true);
      expect(usePlaylistStore.getState().loading).toBe(true);
    });

    it('should set loading to false', () => {
      usePlaylistStore.getState().setLoading(true);
      usePlaylistStore.getState().setLoading(false);
      expect(usePlaylistStore.getState().loading).toBe(false);
    });
  });

  describe('Error State', () => {
    it('should set error message', () => {
      usePlaylistStore.getState().setError('Something went wrong');
      expect(usePlaylistStore.getState().error).toBe('Something went wrong');
    });

    it('should clear error message', () => {
      usePlaylistStore.getState().setError('Error');
      usePlaylistStore.getState().setError(null);
      expect(usePlaylistStore.getState().error).toBeNull();
    });
  });

  describe('Pending Actions (Optimistic Updates)', () => {
    it('should add pending action', () => {
      usePlaylistStore.getState().addPendingAction('action-1');

      expect(usePlaylistStore.getState().isPending('action-1')).toBe(true);
      expect(usePlaylistStore.getState().pendingActions.size).toBe(1);
    });

    it('should add multiple pending actions', () => {
      usePlaylistStore.getState().addPendingAction('action-1');
      usePlaylistStore.getState().addPendingAction('action-2');
      usePlaylistStore.getState().addPendingAction('action-3');

      expect(usePlaylistStore.getState().pendingActions.size).toBe(3);
      expect(usePlaylistStore.getState().isPending('action-2')).toBe(true);
    });

    it('should remove pending action', () => {
      usePlaylistStore.getState().addPendingAction('action-1');
      usePlaylistStore.getState().removePendingAction('action-1');

      expect(usePlaylistStore.getState().isPending('action-1')).toBe(false);
      expect(usePlaylistStore.getState().pendingActions.size).toBe(0);
    });

    it('should handle removing non-existent action', () => {
      usePlaylistStore.getState().addPendingAction('action-1');
      usePlaylistStore.getState().removePendingAction('non-existent');

      expect(usePlaylistStore.getState().pendingActions.size).toBe(1);
    });

    it('should check if action is pending', () => {
      usePlaylistStore.getState().addPendingAction('action-1');

      expect(usePlaylistStore.getState().isPending('action-1')).toBe(true);
      expect(usePlaylistStore.getState().isPending('action-2')).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      // Set up some state
      usePlaylistStore.getState().setTracks([
        createMockTrack('1', 0),
        createMockTrack('2', 1),
      ]);
      usePlaylistStore.getState().setLoading(true);
      usePlaylistStore.getState().setError('Test error');
      usePlaylistStore.getState().addPendingAction('action-1');

      // Reset
      usePlaylistStore.getState().reset();
      const state = usePlaylistStore.getState();

      expect(state.tracks).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.pendingActions.size).toBe(0);
    });

    it('should allow new state after reset', () => {
      usePlaylistStore.getState().setTracks([createMockTrack('1', 0)]);
      usePlaylistStore.getState().reset();
      usePlaylistStore.getState().addTrack(createMockTrack('2', 0, 'New Track'));

      const state = usePlaylistStore.getState();
      expect(state.tracks).toHaveLength(1);
      expect(state.tracks[0].id).toBe('2');
    });
  });
});
