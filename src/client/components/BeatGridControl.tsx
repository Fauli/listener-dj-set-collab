/**
 * BeatGridControl - Set beat grid by tapping on beat 1 or auto-detection
 * Used for quantization and beat-aligned features
 */

import { useState } from 'react';
import { detectBeats, fetchAndDecodeAudio } from '../utils/beatDetection';

interface BeatGridControlProps {
  currentTime: number;
  firstBeatTime: number | null;
  audioUrl: string | null;
  onSetBeatGrid: (time: number) => void;
  onClearBeatGrid: () => void;
  accentColor?: string;
}

export default function BeatGridControl({
  currentTime,
  firstBeatTime,
  audioUrl,
  onSetBeatGrid,
  onClearBeatGrid,
  accentColor = 'primary',
}: BeatGridControlProps) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);

  const handleTap = () => {
    // Set beat 1 at current playback time
    onSetBeatGrid(currentTime);
    setDetectedBpm(null);
  };

  const handleAutoDetect = async () => {
    if (!audioUrl) return;

    setIsDetecting(true);
    setDetectionError(null);

    try {
      // Create audio context for decoding
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();

      // Fetch and decode audio
      const audioBuffer = await fetchAndDecodeAudio(audioUrl, audioContext);

      // Detect beats
      const result = await detectBeats(audioBuffer, {
        maxDuration: 30,
        minBpm: 80,
        maxBpm: 180,
        sensitivity: 0.7,
      });

      console.log('[BeatGrid] Auto-detection result:', result);

      // Set the first beat time
      onSetBeatGrid(result.firstBeatTime);
      setDetectedBpm(result.detectedBpm);

      // Clean up
      audioContext.close();
    } catch (error) {
      console.error('[BeatGrid] Auto-detection failed:', error);
      setDetectionError(error instanceof Error ? error.message : 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  const isSet = firstBeatTime !== null;
  const activeColor = accentColor === 'primary' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-purple-600 hover:bg-purple-700';
  const borderColor = accentColor === 'primary' ? 'border-primary-500' : 'border-purple-500';

  return (
    <div className="bg-gray-800/50 rounded p-1.5 border border-gray-700">
      {/* Compact header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-gray-400 uppercase">Grid</span>
        {isSet && (
          <svg className="w-2.5 h-2.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Compact buttons */}
      <div className="space-y-1">
        <button
          onClick={handleAutoDetect}
          disabled={!audioUrl || isDetecting}
          className={`w-full py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
            isDetecting
              ? 'bg-gray-700 text-gray-400 cursor-wait'
              : !audioUrl
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : `${activeColor} text-white`
          }`}
          title="Auto-detect first beat"
        >
          {isDetecting ? (
            <span className="flex items-center justify-center gap-1">
              <div className="w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Analyzing
            </span>
          ) : (
            'Auto-Detect'
          )}
        </button>

        <button
          onClick={handleTap}
          className="w-full py-1 px-2 rounded text-[10px] font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
          title="Manually tap on beat 1"
        >
          {isSet ? 'Re-tap' : 'Tap'}
        </button>

        {/* Error or status */}
        {detectionError ? (
          <div className="text-[9px] text-red-400 text-center leading-tight">
            {detectionError}
          </div>
        ) : isSet ? (
          <div className="space-y-1">
            <div className="text-[9px] text-gray-500 text-center leading-tight">
              {firstBeatTime?.toFixed(2)}s
              {detectedBpm && <span className="text-green-400"> • {detectedBpm}</span>}
            </div>
            <button
              onClick={onClearBeatGrid}
              className="w-full py-1 px-2 text-[9px] rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="text-[9px] text-gray-500 text-center leading-tight">
            Detect or tap beat 1
          </div>
        )}
      </div>
    </div>
  );
}
