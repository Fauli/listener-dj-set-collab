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
  isLoading: boolean;
  error: string | null;
}

interface DeckStoreState {
  deckA: DeckState;
  deckB: DeckState;

  // Actions
  loadTrack: (deckId: 'A' | 'B', track: PlaylistTrack) => void;
  unloadTrack: (deckId: 'A' | 'B') => void;
  setPlaying: (deckId: 'A' | 'B', playing: boolean) => void;
  setPaused: (deckId: 'A' | 'B', paused: boolean) => void;
  setCurrentTime: (deckId: 'A' | 'B', time: number) => void;
  setDuration: (deckId: 'A' | 'B', duration: number) => void;
  setVolume: (deckId: 'A' | 'B', volume: number) => void;
  toggleLoop: (deckId: 'A' | 'B') => void;
  setLoading: (deckId: 'A' | 'B', loading: boolean) => void;
  setError: (deckId: 'A' | 'B', error: string | null) => void;
  reset: (deckId: 'A' | 'B') => void;
}

const initialDeckState: DeckState = {
  track: null,
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  loop: false,
  isLoading: false,
  error: null,
};

export const useDeckStore = create<DeckStoreState>((set) => ({
  deckA: { ...initialDeckState },
  deckB: { ...initialDeckState },

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

  reset: (deckId) =>
    set((state) => ({
      [deckId === 'A' ? 'deckA' : 'deckB']: {
        ...initialDeckState,
        volume: state[deckId === 'A' ? 'deckA' : 'deckB'].volume,
      },
    })),
}));
