/**
 * Deck Store - State management for dual audio player decks
 * Manages playback state, loaded tracks, and controls for Deck A and Deck B
 */

import { create } from 'zustand';
import type { PlaylistTrack } from './playlistStore';

export interface DeckState {
  track: PlaylistTrack | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;
  rate: number; // Playback rate: 0.92 to 1.08 (±8%)
  eqLow: number; // EQ Low: -12 to +12 dB
  eqMid: number; // EQ Mid: -12 to +12 dB
  eqHigh: number; // EQ High: -12 to +12 dB
  isLoading: boolean;
  error: string | null;
  firstBeatTime: number | null; // Time in seconds where beat 1 occurs (for beat grid)
}

interface DeckStoreState {
  deckA: DeckState;
  deckB: DeckState;
  crossfaderPosition: number; // -1 (100% A) to 1 (100% B)

  // Actions
  loadTrack: (deckId: 'A' | 'B', track: PlaylistTrack) => void;
  unloadTrack: (deckId: 'A' | 'B') => void;
  setPlaying: (deckId: 'A' | 'B', playing: boolean) => void;
  setPaused: (deckId: 'A' | 'B', paused: boolean) => void;
  setCurrentTime: (deckId: 'A' | 'B', time: number) => void;
  setDuration: (deckId: 'A' | 'B', duration: number) => void;
  setVolume: (deckId: 'A' | 'B', volume: number) => void;
  toggleLoop: (deckId: 'A' | 'B') => void;
  setRate: (deckId: 'A' | 'B', rate: number) => void;
  setEQLow: (deckId: 'A' | 'B', value: number) => void;
  setEQMid: (deckId: 'A' | 'B', value: number) => void;
  setEQHigh: (deckId: 'A' | 'B', value: number) => void;
  setLoading: (deckId: 'A' | 'B', loading: boolean) => void;
  setError: (deckId: 'A' | 'B', error: string | null) => void;
  setFirstBeatTime: (deckId: 'A' | 'B', time: number | null) => void;
  reset: (deckId: 'A' | 'B') => void;
  setCrossfaderPosition: (position: number) => void;
  getCrossfaderVolume: (deckId: 'A' | 'B') => number;
}

const initialDeckState: DeckState = {
  track: null,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  loop: false,
  rate: 1.0, // Normal speed
  eqLow: 0, // Flat EQ
  eqMid: 0,
  eqHigh: 0,
  isLoading: false,
  error: null,
  firstBeatTime: null, // No beat grid by default
};

export const useDeckStore = create<DeckStoreState>((set, get) => ({
  deckA: { ...initialDeckState },
  deckB: { ...initialDeckState },
  crossfaderPosition: 0, // Start at center (50/50 mix)

  loadTrack: (deckId, track) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        track,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isPaused: false,
        error: null,
      },
    })),

  unloadTrack: (deckId) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...initialDeckState,
        volume: state[deckId === 'A' ? 'deckA' : 'deckB'].volume,
      },
    })),

  setPlaying: (deckId, playing) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        isPlaying: playing,
        isPaused: !playing && state[deckId === 'A' ? 'deckA' : 'deckB'].currentTime > 0,
      },
    })),

  setPaused: (deckId, paused) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        isPaused: paused,
        isPlaying: !paused,
      },
    })),

  setCurrentTime: (deckId, time) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        currentTime: time,
      },
    })),

  setDuration: (deckId, duration) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        duration,
      },
    })),

  setVolume: (deckId, volume) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        volume: Math.max(0, Math.min(1, volume)),
      },
    })),

  toggleLoop: (deckId) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        loop: !state[deckId === 'A' ? 'deckA' : 'deckB'].loop,
      },
    })),

  setRate: (deckId, rate) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        rate: Math.max(0.92, Math.min(1.08, rate)), // Clamp to ±8%
      },
    })),

  setEQLow: (deckId, value) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        eqLow: Math.max(-12, Math.min(12, value)),
      },
    })),

  setEQMid: (deckId, value) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        eqMid: Math.max(-12, Math.min(12, value)),
      },
    })),

  setEQHigh: (deckId, value) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        eqHigh: Math.max(-12, Math.min(12, value)),
      },
    })),

  setLoading: (deckId, loading) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        isLoading: loading,
      },
    })),

  setError: (deckId, error) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        error,
        isLoading: false,
      },
    })),

  setFirstBeatTime: (deckId, time) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...state[deckId === 'A' ? 'deckA' : 'deckB'],
        firstBeatTime: time,
      },
    })),

  reset: (deckId) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...initialDeckState,
        volume: state[deckId === 'A' ? 'deckA' : 'deckB'].volume,
      },
    })),

  setCrossfaderPosition: (position) =>
    set({ crossfaderPosition: Math.max(-1, Math.min(1, position)) }),

  /**
   * Calculate effective volume for a deck based on crossfader position
   * Uses smooth curve for natural mixing feel
   */
  getCrossfaderVolume: (deckId) => {
    const state = get();
    const position = state.crossfaderPosition;

    if (deckId === 'A') {
      // Deck A: Full volume at -1, silent at +1
      // Use smooth curve: (1 - position) / 2
      return Math.max(0, Math.min(1, (1 - position) / 2));
    } else {
      // Deck B: Silent at -1, full volume at +1
      // Use smooth curve: (1 + position) / 2
      return Math.max(0, Math.min(1, (1 + position) / 2));
    }
  },
}));
