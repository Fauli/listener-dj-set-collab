/**
 * DeckPlayer - Complete audio deck with playback controls, waveform, and track info
 */

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useDeckStore } from '../stores/deckStore';
import type { PlaylistTrack } from '../stores/playlistStore';
import type { CuePoints as CuePointsType } from '../stores/deckStore';
import { quantizeToNearestBeat } from '../utils/beatGrid';
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
          <TrackInfo track={deck.track} isPlaying={deck.isPlaying} />

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

          {/* Controls - Ultra Compact Horizontal Layout */}
          <div className={`px-2 py-1.5 border-t ${borderColor}`}>
            {/* Transport + Knobs Row */}
            <div className="flex items-center gap-3">
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

              {/* Knobs - Horizontal Row */}
              <div className="flex items-start gap-2 flex-1">
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

              {/* Beat Grid - Ultra Compact */}
              <div className="flex-shrink-0" style={{ width: '100px' }}>
                <BeatGridControl
                  currentTime={deck.currentTime}
                  firstBeatTime={deck.firstBeatTime}
                  audioUrl={audioUrl}
                  onSetBeatGrid={handleSetBeatGrid}
                  onClearBeatGrid={handleClearBeatGrid}
                  accentColor={accentColor}
                />
              </div>

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
