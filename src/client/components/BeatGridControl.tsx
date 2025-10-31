/**
 * BeatGridControl - Set beat grid by tapping on beat 1 or auto-detection
 * Used for quantization and beat-aligned features
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [confidence, setConfidence] = useState<number | null>(null);
  const processedUrlRef = useRef<string | null>(null);

  const handleTap = () => {
    // Set beat 1 at current playback time
    onSetBeatGrid(currentTime);
    setDetectedBpm(null);
    setConfidence(null);
  };

  const handleAutoDetect = useCallback(async () => {
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
      setConfidence(result.confidence);

      // Clean up
      audioContext.close();
    } catch (error) {
      console.error('[BeatGrid] Auto-detection failed:', error);
      setDetectionError(error instanceof Error ? error.message : 'Detection failed');
    } finally {
      setIsDetecting(false);
    }
  }, [audioUrl, onSetBeatGrid]);

  // TODO: Make auto-detect on load configurable in user settings (Phase 2+)
  // Auto-run beat detection when a new track is loaded (if no beat grid is set)
  useEffect(() => {
    // Only auto-detect if:
    // 1. Audio URL exists
    // 2. No beat grid is currently set
    // 3. We haven't already processed this URL
    // 4. Not currently detecting
    if (
      audioUrl &&
      firstBeatTime === null &&
      audioUrl !== processedUrlRef.current &&
      !isDetecting
    ) {
      processedUrlRef.current = audioUrl;
      console.log('[BeatGrid] Auto-running beat detection for new track...');
      handleAutoDetect();
    }

    // Reset processed URL when audio URL changes to null (track unloaded)
    if (!audioUrl) {
      processedUrlRef.current = null;
    }
  }, [audioUrl, firstBeatTime, isDetecting, handleAutoDetect]);

  const isSet = firstBeatTime !== null;
  const activeColor = accentColor === 'primary' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-purple-600 hover:bg-purple-700';
  const borderColor = accentColor === 'primary' ? 'border-primary-500' : 'border-purple-500';

  return (
    <div className="bg-gray-800/50 rounded p-1.5 border border-gray-700">
      {/* Horizontal layout - single row */}
      <div className="flex items-center gap-1.5">
        {/* Label with status indicator */}
        <div className="flex items-center gap-1 flex-shrink-0">
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

        {/* Buttons in horizontal row */}
        <button
          onClick={handleAutoDetect}
          disabled={!audioUrl || isDetecting}
          className={`py-1 px-2 rounded text-[10px] font-medium transition-all flex-shrink-0 ${
            isDetecting
              ? 'bg-gray-700 text-gray-400 cursor-wait'
              : !audioUrl
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : `${activeColor} text-white`
          }`}
          title="Auto-detect first beat"
        >
          {isDetecting ? (
            <span className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ...
            </span>
          ) : (
            'Auto'
          )}
        </button>

        <button
          onClick={handleTap}
          className="py-1 px-2 rounded text-[10px] font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition flex-shrink-0"
          title="Manually tap on beat 1"
        >
          Tap
        </button>

        {/* Status info - inline */}
        <div className="text-[9px] text-gray-500 flex-1 min-w-0">
          {detectionError ? (
            <span className="text-red-400 truncate">{detectionError}</span>
          ) : isSet ? (
            <span className="truncate">
              {firstBeatTime?.toFixed(2)}s
              {detectedBpm && <span className="text-green-400"> • {detectedBpm}</span>}
              {confidence !== null && (
                <span
                  className={`ml-1 ${
                    confidence >= 0.8
                      ? 'text-green-400'
                      : confidence >= 0.6
                      ? 'text-yellow-400'
                      : 'text-orange-400'
                  }`}
                  title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
                >
                  • {(confidence * 100).toFixed(0)}%
                </span>
              )}
            </span>
          ) : (
            <span className="truncate">Ready</span>
          )}
        </div>

        {/* Clear button - only show when set */}
        {isSet && (
          <button
            onClick={onClearBeatGrid}
            className="py-1 px-2 text-[9px] rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition flex-shrink-0"
            title="Clear beat grid"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
