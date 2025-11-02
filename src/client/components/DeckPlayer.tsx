/**
 * DeckPlayer - Complete audio deck with playback controls, waveform, and track info
 */

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useDeckStore } from '../stores/deckStore';
import type { PlaylistTrack } from '../stores/playlistStore';
import type { CuePoints as CuePointsType } from '../stores/deckStore';
import { quantizeToNearestBeat, calculateAlignedPosition } from '../utils/beatGrid';
import TrackInfo from './TrackInfo';
import Waveform from './Waveform';
import ZoomedWaveform from './ZoomedWaveform';
import SeekBar from './SeekBar';
import TransportControls from './TransportControls';
import Knob from './Knob';
import BeatGridControl from './BeatGridControl';
import CuePoints from './CuePoints';
import TrackSelectorModal from './TrackSelectorModal';

interface DeckPlayerProps {
  deckId: 'A' | 'B';
  onLoadFunctionReady?: (loadFn: (track: PlaylistTrack) => void) => void;
}

export default function DeckPlayer({ deckId, onLoadFunctionReady }: DeckPlayerProps) {
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const { deck, load, play, pause, stop, seek, changeVolume, toggleLoop, changeRate, changeEQLow, changeEQMid, changeEQHigh, unload } = useAudioPlayer(deckId);
  const setFirstBeatTime = useDeckStore((state) => state.setFirstBeatTime);
  const setCuePoint = useDeckStore((state) => state.setCuePoint);

  // Get the other deck's state for sync functionality
  const otherDeck = useDeckStore((state) => (deckId === 'A' ? state.deckB : state.deckA));

  const accentColor = deckId === 'A' ? 'primary' : 'purple';
  const borderColor = deckId === 'A' ? 'border-primary-600/30' : 'border-purple-600/30';
  const bgColor = deckId === 'A' ? 'bg-primary-900/10' : 'bg-purple-900/10';

  const handleLoadTrack = (track: PlaylistTrack) => {
    load(track);
  };

  // Expose the load function to parent component
  useEffect(() => {
    if (onLoadFunctionReady) {
      onLoadFunctionReady(load);
    }
  }, [load, onLoadFunctionReady]);

  const handleUnload = () => {
    stop();
    unload();
  };

  const handleSetBeatGrid = (time: number) => {
    setFirstBeatTime(deckId, time);
  };

  const handleClearBeatGrid = () => {
    setFirstBeatTime(deckId, null);
  };

  const handleNudgeBeatGridLeft = () => {
    if (deck.firstBeatTime !== null) {
      // Shift beat grid earlier by 10ms
      setFirstBeatTime(deckId, deck.firstBeatTime - 0.01);
      // Also seek playback backward by 10ms so DJ can hear the alignment change
      seek(Math.max(0, deck.currentTime - 0.01));
    }
  };

  const handleNudgeBeatGridRight = () => {
    if (deck.firstBeatTime !== null) {
      // Shift beat grid later by 10ms
      setFirstBeatTime(deckId, deck.firstBeatTime + 0.01);
      // Also seek playback forward by 10ms so DJ can hear the alignment change
      seek(deck.currentTime + 0.01);
    }
  };

  const handleSetCue = async (cueType: keyof CuePointsType) => {
    // Snap to nearest beat if beat grid is set
    let cueTime = deck.currentTime;
    if (deck.firstBeatTime !== null && deck.track?.track.bpm) {
      cueTime = quantizeToNearestBeat(deck.currentTime, {
        firstBeatTime: deck.firstBeatTime,
        bpm: deck.track.track.bpm,
      });
    }
    setCuePoint(deckId, cueType, cueTime);

    // Save to database if track is loaded
    if (deck.track) {
      try {
        const newCuePoints = { ...deck.cuePoints, [cueType]: cueTime };
        const response = await fetch(`/api/rooms/${deck.track.roomId}/tracks/${deck.track.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cuePoints: newCuePoints }),
        });

        // Ignore 404 errors (track was removed/reloaded)
        if (!response.ok && response.status !== 404) {
          console.warn('Failed to save cue point:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to save cue point:', error);
      }
    }
  };

  const handleJumpToCue = (cueType: keyof CuePointsType) => {
    const cueTime = deck.cuePoints[cueType];
    if (cueTime !== null) {
      seek(cueTime);
    }
  };

  const handleDeleteCue = async (cueType: keyof CuePointsType) => {
    setCuePoint(deckId, cueType, null);

    // Save to database if track is loaded
    if (deck.track) {
      try {
        const newCuePoints = { ...deck.cuePoints, [cueType]: null };
        await fetch(`/api/rooms/${deck.track.roomId}/tracks/${deck.track.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cuePoints: newCuePoints }),
        });
      } catch (error) {
        console.error('Failed to delete cue point:', error);
      }
    }
  };

  const handleSync = () => {
    // Sync this deck's BPM to match the other deck
    if (!deck.track?.track.bpm || !otherDeck.track?.track.bpm) return;

    const currentBpm = deck.track.track.bpm * deck.rate;
    const targetBpm = otherDeck.track.track.bpm * otherDeck.rate;

    // Calculate required rate to match target BPM
    const requiredRate = targetBpm / deck.track.track.bpm;

    // Clamp to valid range (0.92 - 1.08)
    const clampedRate = Math.max(0.92, Math.min(1.08, requiredRate));

    changeRate(clampedRate);
  };

  const handleSyncAndPlay = () => {
    // Sync BPM and beat-align, then start playback
    if (!canSyncAndPlay) return;

    // Step 1: Match BPM first
    handleSync();

    // Step 2: Bar-aware beat alignment
    // Get the source deck's (playing deck's) current beat info
    const sourceBeatDuration = 60 / (otherDeck.track!.track.bpm! * otherDeck.rate);
    const sourceTimeSinceFirstBeat = otherDeck.currentTime - otherDeck.firstBeatTime!;
    const sourceAbsoluteBeat = sourceTimeSinceFirstBeat / sourceBeatDuration;
    const sourceBeatInBar = ((Math.floor(sourceAbsoluteBeat) % 4) + 4) % 4; // 0-3 (beat 1-4)
    const sourcePhase = sourceAbsoluteBeat - Math.floor(sourceAbsoluteBeat); // 0-1 within current beat

    // Get this deck's current position info
    const targetBeatDuration = 60 / (deck.track!.track.bpm! * deck.rate);
    const targetTimeSinceFirstBeat = deck.currentTime - deck.firstBeatTime!;
    const targetAbsoluteBeat = targetTimeSinceFirstBeat / targetBeatDuration;
    const currentBeatInBar = ((Math.floor(targetAbsoluteBeat) % 4) + 4) % 4; // 0-3 (beat 1-4)

    // Find the nearest beat with the same beat-in-bar position
    // Calculate how many beats to shift forward or backward
    let beatShift = sourceBeatInBar - currentBeatInBar;

    // Choose the closest direction (forward or backward)
    if (beatShift > 2) beatShift -= 4;
    if (beatShift < -2) beatShift += 4;

    // Calculate the target beat number
    const targetBeat = Math.floor(targetAbsoluteBeat) + beatShift;
    const targetBeatTime = deck.firstBeatTime! + (targetBeat * targetBeatDuration);

    // Apply the source's phase to this beat
    const alignedPosition = targetBeatTime + (sourcePhase * targetBeatDuration);

    // Step 3: Seek to aligned position (small adjustment from current position)
    seek(Math.max(0, alignedPosition));

    // Step 4: Start playback
    // Use a small delay to ensure seek completes
    setTimeout(() => {
      play();
    }, 50);
  };

  // Check if decks are in sync (within 0.1 BPM)
  const isInSync =
    deck.track?.track.bpm &&
    otherDeck.track?.track.bpm &&
    Math.abs(
      deck.track.track.bpm * deck.rate - otherDeck.track.track.bpm * otherDeck.rate
    ) < 0.1;

  // Can sync if both decks have tracks with BPM and not already in sync
  const canSync = deck.track?.track.bpm && otherDeck.track?.track.bpm && !isInSync;

  // Can sync and play if:
  // 1. Both decks have tracks with BPM
  // 2. Both decks have beat grids set
  // 3. Other deck is playing
  // 4. This deck is not playing
  const canSyncAndPlay =
    deck.track?.track.bpm &&
    otherDeck.track?.track.bpm &&
    deck.firstBeatTime !== null &&
    otherDeck.firstBeatTime !== null &&
    otherDeck.isPlaying &&
    !deck.isPlaying;

  const audioUrl = deck.track ? `http://localhost:3000/api/upload/${deck.track.track.id}/audio` : null;

  return (
    <>
      <div className={`bg-gray-800 rounded-lg border-2 ${borderColor} ${bgColor} overflow-hidden flex flex-col h-full`}>
        {/* Header - Ultra Compact */}
        <div className={`px-2 py-1 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded flex items-center justify-center font-bold text-base ${
                accentColor === 'primary' ? 'bg-primary-600' : 'bg-purple-600'
              }`}
            >
              {deckId}
            </div>
            <div>
              <h2 className="font-bold text-sm">Deck {deckId}</h2>
              <p className="text-[10px] text-gray-500">
                {deck.track ? 'Loaded' : 'Empty'}
              </p>
            </div>
          </div>

          {/* Load/Unload Buttons */}
          <div className="flex gap-1.5">
            {deck.track && (
              <button
                onClick={handleUnload}
                className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 transition flex items-center gap-1"
                title="Unload track"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Unload
              </button>
            )}
            <button
              onClick={() => setShowTrackSelector(true)}
              className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
                accentColor === 'primary'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
              title="Load track from playlist"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Load
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Track Info */}
          <TrackInfo track={deck.track} isPlaying={deck.isPlaying} rate={deck.rate} accentColor={accentColor} />

          {/* Waveform - Compact */}
          <div className="px-2 py-1">
            {deck.isLoading ? (
              <div className="h-[50px] bg-gray-900/50 rounded flex items-center justify-center">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              </div>
            ) : deck.error ? (
              <div className="h-[50px] bg-red-900/20 border border-red-600/30 rounded flex items-center justify-center">
                <p className="text-red-400 text-xs">{deck.error}</p>
              </div>
            ) : deck.track ? (
              <Waveform
                audioUrl={audioUrl}
                currentTime={deck.currentTime}
                isPlaying={deck.isPlaying}
                onSeek={seek}
                accentColor={accentColor}
                firstBeatTime={deck.firstBeatTime}
                bpm={deck.track?.track.bpm}
                rate={deck.rate}
                duration={deck.duration}
                cuePoints={deck.cuePoints}
              />
            ) : (
              <div className="h-[50px] bg-gray-900/50 rounded flex items-center justify-center">
                <p className="text-xs text-gray-500">Load a track</p>
              </div>
            )}
          </div>

          {/* Zoomed Waveform - Close-up view for better beat grid visibility */}
          <div className="px-2 py-1">
            {deck.track && !deck.isLoading && !deck.error ? (
              <ZoomedWaveform
                audioUrl={audioUrl}
                currentTime={deck.currentTime}
                isPlaying={deck.isPlaying}
                onSeek={seek}
                accentColor={accentColor}
                firstBeatTime={deck.firstBeatTime}
                bpm={deck.track?.track.bpm}
                rate={deck.rate}
                duration={deck.duration}
                zoomWindowSeconds={20}
                cuePoints={deck.cuePoints}
              />
            ) : (
              <div className="h-[60px] bg-gray-900/50 rounded flex items-center justify-center">
                <p className="text-xs text-gray-500">Zoomed view</p>
              </div>
            )}
          </div>

          {/* Seek Bar - Ultra Compact */}
          <div className="px-2 pb-1">
            <SeekBar
              currentTime={deck.currentTime}
              duration={deck.duration}
              onSeek={seek}
              accentColor={accentColor}
            />
          </div>

          {/* Controls - Single Row with Better Organization */}
          <div className={`px-2 py-1.5 border-t ${borderColor}`}>
            <div className="flex items-center gap-2.5">
              {/* Transport Controls */}
              <div className="flex-shrink-0">
                <TransportControls
                  isPlaying={deck.isPlaying}
                  loop={deck.loop}
                  disabled={!deck.track || deck.isLoading}
                  onPlay={play}
                  onPause={pause}
                  onStop={stop}
                  onToggleLoop={toggleLoop}
                  accentColor={accentColor}
                />
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-700/50" />

              {/* Cue Points */}
              <div className="flex-shrink-0">
                <CuePoints
                  cuePoints={deck.cuePoints}
                  currentTime={deck.currentTime}
                  onSetCue={handleSetCue}
                  onJumpToCue={handleJumpToCue}
                  onDeleteCue={handleDeleteCue}
                />
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-700/50" />

              {/* Beat Grid Controls */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <BeatGridControl
                  currentTime={deck.currentTime}
                  firstBeatTime={deck.firstBeatTime}
                  audioUrl={audioUrl}
                  onSetBeatGrid={handleSetBeatGrid}
                  onClearBeatGrid={handleClearBeatGrid}
                  accentColor={accentColor}
                />
                {/* Beat Grid Nudge Buttons */}
                {deck.firstBeatTime !== null && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={handleNudgeBeatGridLeft}
                      className={`p-1 rounded text-xs font-medium transition-all ${
                        accentColor === 'primary'
                          ? 'bg-primary-600/20 hover:bg-primary-600/40 text-primary-300'
                          : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300'
                      }`}
                      title="Nudge beat grid earlier (10ms)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNudgeBeatGridRight}
                      className={`p-1 rounded text-xs font-medium transition-all ${
                        accentColor === 'primary'
                          ? 'bg-primary-600/20 hover:bg-primary-600/40 text-primary-300'
                          : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-300'
                      }`}
                      title="Nudge beat grid later (10ms)"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-700/50" />

              {/* Knobs Group */}
              <div className="flex items-start gap-1.5">
                <Knob
                  label="Vol"
                  value={deck.volume}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={changeVolume}
                  unit="%"
                  color={accentColor === 'primary' ? '#3b82f6' : '#a855f7'}
                  size="xs"
                />

                <Knob
                  label="Tempo"
                  value={deck.rate}
                  min={0.92}
                  max={1.08}
                  step={0.001}
                  onChange={changeRate}
                  unit="BPM"
                  color={accentColor === 'primary' ? '#3b82f6' : '#a855f7'}
                  size="xs"
                />

                <Knob
                  label="Low"
                  value={deck.eqLow}
                  min={-12}
                  max={12}
                  step={0.5}
                  onChange={changeEQLow}
                  unit="dB"
                  color="#ef4444"
                  size="xs"
                />

                <Knob
                  label="Mid"
                  value={deck.eqMid}
                  min={-12}
                  max={12}
                  step={0.5}
                  onChange={changeEQMid}
                  unit="dB"
                  color="#f59e0b"
                  size="xs"
                />

                <Knob
                  label="High"
                  value={deck.eqHigh}
                  min={-12}
                  max={12}
                  step={0.5}
                  onChange={changeEQHigh}
                  unit="dB"
                  color="#3b82f6"
                  size="xs"
                />
              </div>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-700/50" />

              {/* Sync Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSync}
                  disabled={!canSync}
                  className={`p-1.5 rounded text-xs font-medium transition-all flex items-center justify-center flex-shrink-0 ${
                    isInSync
                      ? 'bg-green-600 text-white'
                      : canSync
                      ? accentColor === 'primary'
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                  title={
                    !deck.track?.track.bpm || !otherDeck.track?.track.bpm
                      ? 'Both decks need tracks with BPM'
                      : isInSync
                      ? 'Decks are in sync'
                      : 'Sync BPM to other deck'
                  }
                >
                  {isInSync ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={handleSyncAndPlay}
                  disabled={!canSyncAndPlay}
                  className={`p-1.5 rounded text-xs font-medium transition-all flex items-center justify-center flex-shrink-0 ${
                    canSyncAndPlay
                      ? accentColor === 'primary'
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                  title={
                    !deck.track?.track.bpm || !otherDeck.track?.track.bpm
                      ? 'Both decks need tracks with BPM'
                      : deck.firstBeatTime === null || otherDeck.firstBeatTime === null
                      ? 'Both decks need beat grids set'
                      : !otherDeck.isPlaying
                      ? 'Other deck must be playing'
                      : deck.isPlaying
                      ? 'This deck is already playing'
                      : 'Sync BPM, align beats, and play'
                  }
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9"
                      opacity="0.6"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Track Selector Modal */}
      <TrackSelectorModal
        isOpen={showTrackSelector}
        deckId={deckId}
        onClose={() => setShowTrackSelector(false)}
        onSelectTrack={handleLoadTrack}
      />
    </>
  );
}
