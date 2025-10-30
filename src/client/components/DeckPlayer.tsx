/**
 * DeckPlayer - Complete audio deck with playback controls, waveform, and track info
 */

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import type { PlaylistTrack } from '../stores/playlistStore';
import TrackInfo from './TrackInfo';
import Waveform from './Waveform';
import SeekBar from './SeekBar';
import TransportControls from './TransportControls';
import VolumeControl from './VolumeControl';
import PitchControl from './PitchControl';
import EQControl from './EQControl';
import TrackSelectorModal from './TrackSelectorModal';

interface DeckPlayerProps {
  deckId: 'A' | 'B';
  onLoadFunctionReady?: (loadFn: (track: PlaylistTrack) => void) => void;
}

export default function DeckPlayer({ deckId, onLoadFunctionReady }: DeckPlayerProps) {
  const [showTrackSelector, setShowTrackSelector] = useState(false);
  const { deck, load, play, pause, stop, seek, changeVolume, toggleLoop, changeRate, changeEQLow, changeEQMid, changeEQHigh, unload } = useAudioPlayer(deckId);

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

  const audioUrl = deck.track ? `http://localhost:3000/api/upload/${deck.track.track.id}/audio` : null;

  return (
    <>
      <div className={`bg-gray-800 rounded-lg border-2 ${borderColor} ${bgColor} overflow-hidden flex flex-col h-full`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b ${borderColor} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                accentColor === 'primary' ? 'bg-primary-600' : 'bg-purple-600'
              }`}
            >
              {deckId}
            </div>
            <div>
              <h2 className="font-bold text-base">Deck {deckId}</h2>
              <p className="text-xs text-gray-500">
                {deck.track ? 'Loaded' : 'Empty'}
              </p>
            </div>
          </div>

          {/* Load/Unload Buttons */}
          <div className="flex gap-2">
            {deck.track && (
              <button
                onClick={handleUnload}
                className="px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 transition flex items-center gap-1.5"
                title="Unload track"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className={`px-3 py-1.5 text-sm rounded transition flex items-center gap-1.5 ${
                accentColor === 'primary'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
              title="Load track from playlist"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Load Track
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Track Info */}
          <TrackInfo track={deck.track} isPlaying={deck.isPlaying} />

          {/* Waveform */}
          <div className="px-4 py-3 flex-1">
            {deck.isLoading ? (
              <div className="h-20 bg-gray-900/50 rounded flex items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Loading audio...
                </div>
              </div>
            ) : deck.error ? (
              <div className="h-20 bg-red-900/20 border border-red-600/30 rounded flex items-center justify-center">
                <p className="text-red-400 text-sm">{deck.error}</p>
              </div>
            ) : deck.track ? (
              <Waveform
                audioUrl={audioUrl}
                currentTime={deck.currentTime}
                isPlaying={deck.isPlaying}
                onSeek={seek}
                accentColor={accentColor}
              />
            ) : (
              <div className="h-20 bg-gray-900/50 rounded flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-50"
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
                  <p className="text-sm">Load a track to begin</p>
                </div>
              </div>
            )}
          </div>

          {/* Seek Bar */}
          <div className="px-4 pb-3">
            <SeekBar
              currentTime={deck.currentTime}
              duration={deck.duration}
              onSeek={seek}
              accentColor={accentColor}
            />
          </div>

          {/* Controls */}
          <div className={`px-4 py-4 border-t ${borderColor} space-y-4`}>
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

            <div className="grid grid-cols-3 gap-4">
              <VolumeControl
                volume={deck.volume}
                onChange={changeVolume}
                accentColor={accentColor}
              />

              <PitchControl
                rate={deck.rate}
                onChange={changeRate}
                accentColor={accentColor}
                originalBpm={deck.track?.track.bpm}
              />

              <EQControl
                low={deck.eqLow}
                mid={deck.eqMid}
                high={deck.eqHigh}
                onLowChange={changeEQLow}
                onMidChange={changeEQMid}
                onHighChange={changeEQHigh}
                accentColor={accentColor}
              />
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
