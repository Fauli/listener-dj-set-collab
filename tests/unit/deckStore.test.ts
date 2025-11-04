/**
 * Unit tests for deckStore
 * Tests dual-deck state management, playback controls, and crossfader
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDeckStore } from '../../src/client/stores/deckStore.js';
import type { PlaylistTrack } from '../../src/client/stores/playlistStore.js';

// Helper to create mock track
function createMockTrack(id: string, title: string = 'Test Track'): PlaylistTrack {
  return {
    id,
    roomId: 'test-room',
    trackId: `track-${id}`,
    position: 0,
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

// Helper to create track with cue points
function createTrackWithCuePoints(id: string): PlaylistTrack {
  return {
    ...createMockTrack(id),
    cuePoints: {
      start: 10.0,
      end: 170.0,
      A: 30.5,
      B: 60.0,
    },
  };
}

describe('deckStore', () => {
  beforeEach(() => {
    // Reset both decks before each test
    useDeckStore.getState().reset('A');
    useDeckStore.getState().reset('B');
    useDeckStore.getState().setCrossfaderPosition(0);
  });

  describe('Initial State', () => {
    it('should have correct initial state for both decks', () => {
      const state = useDeckStore.getState();

      // Deck A
      expect(state.deckA.track).toBeNull();
      expect(state.deckA.isPlaying).toBe(false);
      expect(state.deckA.isPaused).toBe(false);
      expect(state.deckA.currentTime).toBe(0);
      expect(state.deckA.duration).toBe(0);
      expect(state.deckA.volume).toBe(0.8);
      expect(state.deckA.loop).toBe(false);
      expect(state.deckA.rate).toBe(1.0);
      expect(state.deckA.eqLow).toBe(0);
      expect(state.deckA.eqMid).toBe(0);
      expect(state.deckA.eqHigh).toBe(0);
      expect(state.deckA.isLoading).toBe(false);
      expect(state.deckA.error).toBeNull();
      expect(state.deckA.firstBeatTime).toBeNull();
      expect(state.deckA.cuePoints).toEqual({
        start: null,
        end: null,
        A: null,
        B: null,
      });

      // Deck B (should be identical)
      expect(state.deckB.track).toBeNull();
      expect(state.deckB.isPlaying).toBe(false);
      expect(state.deckB.volume).toBe(0.8);

      // Crossfader
      expect(state.crossfaderPosition).toBe(0);
    });
  });

  describe('loadTrack()', () => {
    it('should load track to deck A', () => {
      const track = createMockTrack('1', 'Track 1');
      useDeckStore.getState().loadTrack('A', track);

      const state = useDeckStore.getState();
      expect(state.deckA.track).toBe(track);
      expect(state.deckA.currentTime).toBe(0);
      expect(state.deckA.duration).toBe(0);
      expect(state.deckA.isPlaying).toBe(false);
      expect(state.deckA.isPaused).toBe(false);
      expect(state.deckA.error).toBeNull();
    });

    it('should load track to deck B', () => {
      const track = createMockTrack('2', 'Track 2');
      useDeckStore.getState().loadTrack('B', track);

      const state = useDeckStore.getState();
      expect(state.deckB.track).toBe(track);
      expect(state.deckB.currentTime).toBe(0);
    });

    it('should load cue points from track data', () => {
      const track = createTrackWithCuePoints('1');
      useDeckStore.getState().loadTrack('A', track);

      const state = useDeckStore.getState();
      expect(state.deckA.cuePoints.start).toBe(10.0);
      expect(state.deckA.cuePoints.end).toBe(170.0);
      expect(state.deckA.cuePoints.A).toBe(30.5);
      expect(state.deckA.cuePoints.B).toBe(60.0);
    });

    it('should load track without cue points', () => {
      const track = createMockTrack('1');
      useDeckStore.getState().loadTrack('A', track);

      const state = useDeckStore.getState();
      expect(state.deckA.cuePoints).toEqual({
        start: null,
        end: null,
        A: null,
        B: null,
      });
    });

    it('should allow loading same track to both decks', () => {
      const track = createMockTrack('1', 'Same Track');
      useDeckStore.getState().loadTrack('A', track);
      useDeckStore.getState().loadTrack('B', track);

      const state = useDeckStore.getState();
      expect(state.deckA.track?.track.title).toBe('Same Track');
      expect(state.deckB.track?.track.title).toBe('Same Track');
    });

    it('should reset playback state when loading new track', () => {
      // Load and play first track
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().setPlaying('A', true);
      useDeckStore.getState().setCurrentTime('A', 50);

      // Load new track
      useDeckStore.getState().loadTrack('A', createMockTrack('2'));

      const state = useDeckStore.getState();
      expect(state.deckA.isPlaying).toBe(false);
      expect(state.deckA.currentTime).toBe(0);
    });
  });

  describe('unloadTrack()', () => {
    it('should unload track from deck A', () => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().unloadTrack('A');

      const state = useDeckStore.getState();
      expect(state.deckA.track).toBeNull();
      expect(state.deckA.currentTime).toBe(0);
      expect(state.deckA.isPlaying).toBe(false);
    });

    it('should preserve volume when unloading', () => {
      useDeckStore.getState().setVolume('A', 0.5);
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().unloadTrack('A');

      const state = useDeckStore.getState();
      expect(state.deckA.volume).toBe(0.5);
    });

    it('should not affect other deck when unloading', () => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().loadTrack('B', createMockTrack('2'));
      useDeckStore.getState().unloadTrack('A');

      const state = useDeckStore.getState();
      expect(state.deckA.track).toBeNull();
      expect(state.deckB.track).not.toBeNull();
    });
  });

  describe('Playback Controls', () => {
    beforeEach(() => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
    });

    it('should set playing state', () => {
      useDeckStore.getState().setPlaying('A', true);
      expect(useDeckStore.getState().deckA.isPlaying).toBe(true);
      expect(useDeckStore.getState().deckA.isPaused).toBe(false);
    });

    it('should set paused state when stopping with time > 0', () => {
      useDeckStore.getState().setCurrentTime('A', 50);
      useDeckStore.getState().setPlaying('A', false);

      const state = useDeckStore.getState();
      expect(state.deckA.isPlaying).toBe(false);
      expect(state.deckA.isPaused).toBe(true);
    });

    it('should not be paused when stopping at time 0', () => {
      useDeckStore.getState().setPlaying('A', false);

      const state = useDeckStore.getState();
      expect(state.deckA.isPlaying).toBe(false);
      expect(state.deckA.isPaused).toBe(false);
    });

    it('should set paused directly', () => {
      useDeckStore.getState().setPaused('A', true);
      expect(useDeckStore.getState().deckA.isPaused).toBe(true);
      expect(useDeckStore.getState().deckA.isPlaying).toBe(false);
    });

    it('should unpause when setting paused to false', () => {
      useDeckStore.getState().setPaused('A', true);
      useDeckStore.getState().setPaused('A', false);

      const state = useDeckStore.getState();
      expect(state.deckA.isPaused).toBe(false);
      expect(state.deckA.isPlaying).toBe(true);
    });

    it('should set current time', () => {
      useDeckStore.getState().setCurrentTime('A', 123.45);
      expect(useDeckStore.getState().deckA.currentTime).toBe(123.45);
    });

    it('should set duration', () => {
      useDeckStore.getState().setDuration('A', 240);
      expect(useDeckStore.getState().deckA.duration).toBe(240);
    });
  });

  describe('Volume Control', () => {
    it('should set volume', () => {
      useDeckStore.getState().setVolume('A', 0.6);
      expect(useDeckStore.getState().deckA.volume).toBe(0.6);
    });

    it('should clamp volume to 0', () => {
      useDeckStore.getState().setVolume('A', -0.5);
      expect(useDeckStore.getState().deckA.volume).toBe(0);
    });

    it('should clamp volume to 1', () => {
      useDeckStore.getState().setVolume('A', 1.5);
      expect(useDeckStore.getState().deckA.volume).toBe(1);
    });
  });

  describe('Loop Control', () => {
    it('should toggle loop on', () => {
      useDeckStore.getState().toggleLoop('A');
      expect(useDeckStore.getState().deckA.loop).toBe(true);
    });

    it('should toggle loop off', () => {
      useDeckStore.getState().toggleLoop('A');
      useDeckStore.getState().toggleLoop('A');
      expect(useDeckStore.getState().deckA.loop).toBe(false);
    });
  });

  describe('Playback Rate', () => {
    it('should set playback rate', () => {
      useDeckStore.getState().setRate('A', 1.05);
      expect(useDeckStore.getState().deckA.rate).toBe(1.05);
    });

    it('should clamp rate to minimum (0.92)', () => {
      useDeckStore.getState().setRate('A', 0.8);
      expect(useDeckStore.getState().deckA.rate).toBe(0.92);
    });

    it('should clamp rate to maximum (1.08)', () => {
      useDeckStore.getState().setRate('A', 1.2);
      expect(useDeckStore.getState().deckA.rate).toBe(1.08);
    });

    it('should allow exact boundaries', () => {
      useDeckStore.getState().setRate('A', 0.92);
      expect(useDeckStore.getState().deckA.rate).toBe(0.92);

      useDeckStore.getState().setRate('A', 1.08);
      expect(useDeckStore.getState().deckA.rate).toBe(1.08);
    });
  });

  describe('EQ Controls', () => {
    describe('EQ Low', () => {
      it('should set EQ low', () => {
        useDeckStore.getState().setEQLow('A', 6);
        expect(useDeckStore.getState().deckA.eqLow).toBe(6);
      });

      it('should clamp EQ low to -12', () => {
        useDeckStore.getState().setEQLow('A', -20);
        expect(useDeckStore.getState().deckA.eqLow).toBe(-12);
      });

      it('should clamp EQ low to +12', () => {
        useDeckStore.getState().setEQLow('A', 20);
        expect(useDeckStore.getState().deckA.eqLow).toBe(12);
      });
    });

    describe('EQ Mid', () => {
      it('should set EQ mid', () => {
        useDeckStore.getState().setEQMid('A', -3);
        expect(useDeckStore.getState().deckA.eqMid).toBe(-3);
      });

      it('should clamp EQ mid to range', () => {
        useDeckStore.getState().setEQMid('A', -15);
        expect(useDeckStore.getState().deckA.eqMid).toBe(-12);

        useDeckStore.getState().setEQMid('A', 15);
        expect(useDeckStore.getState().deckA.eqMid).toBe(12);
      });
    });

    describe('EQ High', () => {
      it('should set EQ high', () => {
        useDeckStore.getState().setEQHigh('A', 9);
        expect(useDeckStore.getState().deckA.eqHigh).toBe(9);
      });

      it('should clamp EQ high to range', () => {
        useDeckStore.getState().setEQHigh('A', -15);
        expect(useDeckStore.getState().deckA.eqHigh).toBe(-12);

        useDeckStore.getState().setEQHigh('A', 15);
        expect(useDeckStore.getState().deckA.eqHigh).toBe(12);
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should set loading state', () => {
      useDeckStore.getState().setLoading('A', true);
      expect(useDeckStore.getState().deckA.isLoading).toBe(true);
    });

    it('should clear loading state', () => {
      useDeckStore.getState().setLoading('A', true);
      useDeckStore.getState().setLoading('A', false);
      expect(useDeckStore.getState().deckA.isLoading).toBe(false);
    });

    it('should set error message', () => {
      useDeckStore.getState().setError('A', 'Failed to load track');
      expect(useDeckStore.getState().deckA.error).toBe('Failed to load track');
    });

    it('should clear loading when setting error', () => {
      useDeckStore.getState().setLoading('A', true);
      useDeckStore.getState().setError('A', 'Error');

      const state = useDeckStore.getState();
      expect(state.deckA.error).toBe('Error');
      expect(state.deckA.isLoading).toBe(false);
    });

    it('should clear error', () => {
      useDeckStore.getState().setError('A', 'Error');
      useDeckStore.getState().setError('A', null);
      expect(useDeckStore.getState().deckA.error).toBeNull();
    });
  });

  describe('Beat Grid', () => {
    it('should set first beat time', () => {
      useDeckStore.getState().setFirstBeatTime('A', 2.5);
      expect(useDeckStore.getState().deckA.firstBeatTime).toBe(2.5);
    });

    it('should clear first beat time', () => {
      useDeckStore.getState().setFirstBeatTime('A', 2.5);
      useDeckStore.getState().setFirstBeatTime('A', null);
      expect(useDeckStore.getState().deckA.firstBeatTime).toBeNull();
    });
  });

  describe('Cue Points', () => {
    beforeEach(() => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
    });

    it('should set cue point start', () => {
      useDeckStore.getState().setCuePoint('A', 'start', 10.0);
      expect(useDeckStore.getState().deckA.cuePoints.start).toBe(10.0);
    });

    it('should set cue point end', () => {
      useDeckStore.getState().setCuePoint('A', 'end', 170.0);
      expect(useDeckStore.getState().deckA.cuePoints.end).toBe(170.0);
    });

    it('should set cue point A', () => {
      useDeckStore.getState().setCuePoint('A', 'A', 30.5);
      expect(useDeckStore.getState().deckA.cuePoints.A).toBe(30.5);
    });

    it('should set cue point B', () => {
      useDeckStore.getState().setCuePoint('A', 'B', 60.0);
      expect(useDeckStore.getState().deckA.cuePoints.B).toBe(60.0);
    });

    it('should update individual cue point without affecting others', () => {
      useDeckStore.getState().setCuePoint('A', 'start', 10.0);
      useDeckStore.getState().setCuePoint('A', 'end', 170.0);
      useDeckStore.getState().setCuePoint('A', 'A', 30.5);

      const state = useDeckStore.getState();
      expect(state.deckA.cuePoints.start).toBe(10.0);
      expect(state.deckA.cuePoints.end).toBe(170.0);
      expect(state.deckA.cuePoints.A).toBe(30.5);
      expect(state.deckA.cuePoints.B).toBeNull();
    });

    it('should clear cue point by setting to null', () => {
      useDeckStore.getState().setCuePoint('A', 'A', 30.5);
      useDeckStore.getState().setCuePoint('A', 'A', null);
      expect(useDeckStore.getState().deckA.cuePoints.A).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should reset deck to initial state', () => {
      // Set up some state
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().setPlaying('A', true);
      useDeckStore.getState().setCurrentTime('A', 50);
      useDeckStore.getState().setVolume('A', 0.5);
      useDeckStore.getState().setEQLow('A', 6);
      useDeckStore.getState().setCuePoint('A', 'A', 30);

      // Reset
      useDeckStore.getState().reset('A');
      const state = useDeckStore.getState();

      expect(state.deckA.track).toBeNull();
      expect(state.deckA.isPlaying).toBe(false);
      expect(state.deckA.currentTime).toBe(0);
      expect(state.deckA.eqLow).toBe(0);
      expect(state.deckA.cuePoints.A).toBeNull();
    });

    it('should preserve volume when resetting', () => {
      useDeckStore.getState().setVolume('A', 0.3);
      useDeckStore.getState().reset('A');
      expect(useDeckStore.getState().deckA.volume).toBe(0.3);
    });

    it('should not affect other deck when resetting', () => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().loadTrack('B', createMockTrack('2'));
      useDeckStore.getState().reset('A');

      const state = useDeckStore.getState();
      expect(state.deckA.track).toBeNull();
      expect(state.deckB.track).not.toBeNull();
    });
  });

  describe('Crossfader', () => {
    it('should set crossfader position', () => {
      useDeckStore.getState().setCrossfaderPosition(0.5);
      expect(useDeckStore.getState().crossfaderPosition).toBe(0.5);
    });

    it('should clamp crossfader to -1', () => {
      useDeckStore.getState().setCrossfaderPosition(-2);
      expect(useDeckStore.getState().crossfaderPosition).toBe(-1);
    });

    it('should clamp crossfader to +1', () => {
      useDeckStore.getState().setCrossfaderPosition(2);
      expect(useDeckStore.getState().crossfaderPosition).toBe(1);
    });

    it('should allow exact boundaries', () => {
      useDeckStore.getState().setCrossfaderPosition(-1);
      expect(useDeckStore.getState().crossfaderPosition).toBe(-1);

      useDeckStore.getState().setCrossfaderPosition(1);
      expect(useDeckStore.getState().crossfaderPosition).toBe(1);
    });
  });

  describe('Crossfader Volume Calculation', () => {
    it('should calculate volume at center (50/50 mix)', () => {
      useDeckStore.getState().setCrossfaderPosition(0);

      expect(useDeckStore.getState().getCrossfaderVolume('A')).toBe(0.5);
      expect(useDeckStore.getState().getCrossfaderVolume('B')).toBe(0.5);
    });

    it('should calculate volume at full A (-1)', () => {
      useDeckStore.getState().setCrossfaderPosition(-1);

      expect(useDeckStore.getState().getCrossfaderVolume('A')).toBe(1);
      expect(useDeckStore.getState().getCrossfaderVolume('B')).toBe(0);
    });

    it('should calculate volume at full B (+1)', () => {
      useDeckStore.getState().setCrossfaderPosition(1);

      expect(useDeckStore.getState().getCrossfaderVolume('A')).toBe(0);
      expect(useDeckStore.getState().getCrossfaderVolume('B')).toBe(1);
    });

    it('should calculate volume at 75% A', () => {
      useDeckStore.getState().setCrossfaderPosition(-0.5);

      expect(useDeckStore.getState().getCrossfaderVolume('A')).toBe(0.75);
      expect(useDeckStore.getState().getCrossfaderVolume('B')).toBe(0.25);
    });

    it('should calculate volume at 75% B', () => {
      useDeckStore.getState().setCrossfaderPosition(0.5);

      expect(useDeckStore.getState().getCrossfaderVolume('A')).toBe(0.25);
      expect(useDeckStore.getState().getCrossfaderVolume('B')).toBe(0.75);
    });
  });

  describe('Independent Deck Operations', () => {
    it('should allow independent playback on both decks', () => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1', 'Track A'));
      useDeckStore.getState().loadTrack('B', createMockTrack('2', 'Track B'));

      useDeckStore.getState().setPlaying('A', true);
      useDeckStore.getState().setPlaying('B', false);

      const state = useDeckStore.getState();
      expect(state.deckA.isPlaying).toBe(true);
      expect(state.deckB.isPlaying).toBe(false);
    });

    it('should allow independent volume control', () => {
      useDeckStore.getState().setVolume('A', 0.3);
      useDeckStore.getState().setVolume('B', 0.9);

      const state = useDeckStore.getState();
      expect(state.deckA.volume).toBe(0.3);
      expect(state.deckB.volume).toBe(0.9);
    });

    it('should allow independent EQ settings', () => {
      useDeckStore.getState().setEQLow('A', -6);
      useDeckStore.getState().setEQMid('A', 0);
      useDeckStore.getState().setEQHigh('A', 3);

      useDeckStore.getState().setEQLow('B', 6);
      useDeckStore.getState().setEQMid('B', -3);
      useDeckStore.getState().setEQHigh('B', 0);

      const state = useDeckStore.getState();
      expect(state.deckA.eqLow).toBe(-6);
      expect(state.deckA.eqMid).toBe(0);
      expect(state.deckA.eqHigh).toBe(3);
      expect(state.deckB.eqLow).toBe(6);
      expect(state.deckB.eqMid).toBe(-3);
      expect(state.deckB.eqHigh).toBe(0);
    });

    it('should allow independent cue points', () => {
      useDeckStore.getState().loadTrack('A', createMockTrack('1'));
      useDeckStore.getState().loadTrack('B', createMockTrack('2'));

      useDeckStore.getState().setCuePoint('A', 'A', 30);
      useDeckStore.getState().setCuePoint('B', 'A', 45);

      const state = useDeckStore.getState();
      expect(state.deckA.cuePoints.A).toBe(30);
      expect(state.deckB.cuePoints.A).toBe(45);
    });
  });
});
