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
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase">Beat Grid</span>
        {isSet && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Set
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Auto-Detect Button */}
        <button
          onClick={handleAutoDetect}
          disabled={!audioUrl || isDetecting}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all ${
            isDetecting
              ? 'bg-gray-700 text-gray-400 cursor-wait'
              : !audioUrl
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : `${activeColor} text-white border-2 ${borderColor}`
          }`}
          title="Automatically detect first beat"
        >
          {isDetecting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </span>
          ) : (
            'Auto-Detect Beats'
          )}
        </button>

        {/* Manual Tap Button */}
        <button
          onClick={handleTap}
          className="w-full py-2 px-4 rounded-lg font-medium text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition"
          title="Manually tap on beat 1"
        >
          {isSet ? 'Re-tap Beat 1' : 'Manual Tap'}
        </button>

        {/* Detection Error */}
        {detectionError && (
          <div className="text-xs text-red-400 text-center leading-tight">
            {detectionError}
          </div>
        )}

        {/* Info / Results */}
        {isSet ? (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 text-center">
              Beat 1 at {firstBeatTime?.toFixed(3)}s
              {detectedBpm && (
                <div className="text-green-400 mt-0.5">
                  Detected: {detectedBpm} BPM
                </div>
              )}
            </div>
            <button
              onClick={onClearBeatGrid}
              className="w-full py-1.5 px-3 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition"
            >
              Clear Grid
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center leading-tight">
            Auto-detect or manually tap beat 1
          </div>
        )}
      </div>
    </div>
  );
}
