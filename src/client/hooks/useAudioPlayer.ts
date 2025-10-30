/**
 * useAudioPlayer - Custom hook for audio playback using Howler.js
 * Manages audio instance lifecycle and syncs state with deck store
 */

import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { useDeckStore } from '../stores/deckStore';
import type { PlaylistTrack } from '../stores/playlistStore';

export function useAudioPlayer(deckId: 'A' | 'B') {
  const howlRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number>();
  const isPlayingRef = useRef<boolean>(false);

  const deck = useDeckStore((state) => (deckId === 'A' ? state.deckA : state.deckB));
  const crossfaderVolume = useDeckStore((state) => state.getCrossfaderVolume(deckId));
  const {
    loadTrack,
    unloadTrack,
    setPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    toggleLoop,
    setRate,
    setLoading,
    setError,
    reset,
  } = useDeckStore();

  // Keep playing state in sync with ref for animation loop
  useEffect(() => {
    isPlayingRef.current = deck.isPlaying;
  }, [deck.isPlaying]);

  // Update current time continuously while playing
  // Use refs to avoid stale closures in animation frame loop
  const updateCurrentTime = useCallback(() => {
    if (howlRef.current && isPlayingRef.current) {
      const time = howlRef.current.seek() as number;
      setCurrentTime(deckId, time);
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    }
  }, [deckId, setCurrentTime]);

  // Load a track
  const load = useCallback(
    (track: PlaylistTrack) => {
      // Clean up existing audio
      if (howlRef.current) {
        howlRef.current.unload();
        howlRef.current = null;
      }

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setLoading(deckId, true);
      setError(deckId, null);

      // Create audio URL from track
      const audioUrl = `http://localhost:3000/api/upload/${track.track.id}/audio`;
      console.log(`[Deck ${deckId}] Loading audio from:`, audioUrl);

      // Detect format from sourceURI if available
      const format = track.track.sourceURI
        ? track.track.sourceURI.split('.').pop()?.toLowerCase()
        : undefined;
      console.log(`[Deck ${deckId}] Audio format:`, format);

      // Create new Howl instance
      const sound = new Howl({
        src: [audioUrl],
        format: format ? [format] : undefined, // Explicitly specify format
        html5: true, // Use HTML5 Audio for streaming
        volume: deck.volume,
        loop: deck.loop,
        onload: () => {
          console.log(`[Deck ${deckId}] Audio loaded successfully. Duration:`, sound.duration());
          loadTrack(deckId, track);
          setDuration(deckId, sound.duration()); // Set duration AFTER loadTrack (which resets it to 0)
          setLoading(deckId, false);
        },
        onloaderror: (_id, error) => {
          console.error(`[Deck ${deckId}] Load error:`, error);
          setError(deckId, 'Failed to load audio file');
          setLoading(deckId, false);
        },
        onplay: () => {
          isPlayingRef.current = true; // Update ref immediately for animation loop
          setPlaying(deckId, true);
          updateCurrentTime();
        },
        onpause: () => {
          isPlayingRef.current = false; // Update ref immediately to stop animation loop
          setPlaying(deckId, false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        },
        onstop: () => {
          isPlayingRef.current = false; // Update ref immediately to stop animation loop
          setPlaying(deckId, false);
          setCurrentTime(deckId, 0);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        },
        onend: () => {
          // Check loop status directly from Howler (more reliable than deck.loop)
          if (!sound.loop()) {
            setPlaying(deckId, false);
            setCurrentTime(deckId, 0);
          }
        },
        onplayerror: (_id, error) => {
          console.error(`[Deck ${deckId}] Play error:`, error);
          setError(deckId, 'Failed to play audio');
        },
      });

      howlRef.current = sound;
    },
    [deckId, deck.volume, deck.loop, setLoading, setError, setDuration, loadTrack, setPlaying, setCurrentTime, updateCurrentTime]
  );

  // Play
  const play = useCallback(() => {
    console.log(`[Deck ${deckId}] Play called. Has howl:`, !!howlRef.current, 'isPlaying:', isPlayingRef.current);
    if (howlRef.current && !isPlayingRef.current) {
      console.log(`[Deck ${deckId}] Calling howl.play()`);
      howlRef.current.play();
    }
  }, [deckId]);

  // Pause
  const pause = useCallback(() => {
    if (howlRef.current && isPlayingRef.current) {
      howlRef.current.pause();
    }
  }, []);

  // Stop
  const stop = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.stop();
    }
  }, []);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (howlRef.current) {
      howlRef.current.seek(time);
      setCurrentTime(deckId, time);
    }
  }, [deckId, setCurrentTime]);

  // Update volume
  const changeVolume = useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      setVolume(deckId, clampedVolume);
      if (howlRef.current) {
        howlRef.current.volume(clampedVolume);
      }
    },
    [deckId, setVolume]
  );

  // Toggle loop
  const toggleLoopMode = useCallback(() => {
    toggleLoop(deckId);
    if (howlRef.current) {
      howlRef.current.loop(!deck.loop);
    }
  }, [deckId, deck.loop, toggleLoop]);

  // Change playback rate
  const changeRate = useCallback(
    (rate: number) => {
      setRate(deckId, rate);
      if (howlRef.current) {
        howlRef.current.rate(rate);
      }
    },
    [deckId, setRate]
  );

  // Unload track
  const unload = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    unloadTrack(deckId);
  }, [deckId, unloadTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (howlRef.current) {
        howlRef.current.unload();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Sync volume changes from store to Howler (deck volume * crossfader volume)
  useEffect(() => {
    if (howlRef.current) {
      const effectiveVolume = deck.volume * crossfaderVolume;
      howlRef.current.volume(effectiveVolume);
    }
  }, [deck.volume, crossfaderVolume]);

  // Sync loop changes from store to Howler
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.loop(deck.loop);
    }
  }, [deck.loop]);

  // Sync rate changes from store to Howler
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.rate(deck.rate);
    }
  }, [deck.rate]);

  return {
    deck,
    load,
    play,
    pause,
    stop,
    seek,
    changeVolume,
    toggleLoop: toggleLoopMode,
    changeRate,
    unload,
  };
}
