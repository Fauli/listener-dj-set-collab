/**
 * ZoomedWaveform - Zoomed-in waveform visualization showing a close-up window around current playback position
 * This provides better visibility of beat grid markers for beatmatching
 */

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { getBeatsInRange } from '../utils/beatGrid';

interface ZoomedWaveformProps {
  audioUrl: string | null;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  accentColor?: string;
  firstBeatTime?: number | null;
  bpm?: number | null;
  rate?: number;
  duration?: number;
  zoomWindowSeconds?: number;
}

export default function ZoomedWaveform({
  audioUrl,
  currentTime,
  isPlaying,
  onSeek,
  accentColor = 'primary',
  firstBeatTime = null,
  bpm = null,
  rate = 1.0,
  duration = 0,
  zoomWindowSeconds = 20,
}: ZoomedWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const isSeekingRef = useRef(false);
  const [translateX, setTranslateX] = useState(0);

  // Get colors based on accent
  const waveColor = accentColor === 'primary'
    ? 'rgb(59, 130, 246)'
    : 'rgb(168, 85, 247)';

  // Create WaveSurfer instance
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: waveColor, // Same color = solid waveform
      cursorColor: 'transparent',
      barWidth: 3,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      backend: 'MediaElement',
      interact: true,
      minPxPerSec: 100, // 100 pixels per second
      hideScrollbar: true,
    });

    wavesurfer.load(audioUrl);

    // Handle click to seek
    const handleInteraction = () => {
      isSeekingRef.current = true;
      const time = wavesurfer.getCurrentTime();
      onSeek(time);
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    };

    wavesurfer.on('interaction', handleInteraction);

    wavesurferRef.current = wavesurfer;

    return () => {
      setTimeout(async () => {
        try {
          await wavesurfer.destroy();
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }, 0);
      wavesurferRef.current = null;
    };
  }, [audioUrl, waveColor, accentColor]);

  // Calculate horizontal translation to keep current position centered
  useEffect(() => {
    if (!isSeekingRef.current && duration > 0 && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const pixelsPerSecond = 100; // Must match minPxPerSec

      // Calculate how far to translate the waveform (negative = move left)
      // We want the current time position to be at the center of the viewport
      const currentPositionPx = currentTime * pixelsPerSecond;
      const centerOffset = containerWidth / 2;

      // Translation: move the waveform left so currentPosition aligns with center
      const translation = centerOffset - currentPositionPx;

      setTranslateX(translation);
    }
  }, [currentTime, duration]);

  // Calculate beat markers in the visible window around current time
  const visibleWindowStart = Math.max(0, currentTime - zoomWindowSeconds / 2);
  const visibleWindowEnd = Math.min(duration, currentTime + zoomWindowSeconds / 2);

  const beatMarkers =
    firstBeatTime !== null && bpm !== null && duration > 0
      ? getBeatsInRange(visibleWindowStart, visibleWindowEnd, { firstBeatTime, bpm, rate })
      : [];

  const containerWidth = containerRef.current?.offsetWidth || 0;
  const pixelsPerSecond = 100;

  // Position beat markers relative to current time
  const visibleBeatMarkers = beatMarkers.map((beatTime) => {
    const offsetFromCenter = beatTime - currentTime;
    const viewportPosition = (containerWidth / 2) + (offsetFromCenter * pixelsPerSecond);

    const beatNumber = Math.round((beatTime - firstBeatTime!) / (60 / (bpm! * rate))) + 1;
    return {
      time: beatTime,
      viewportPosition,
      beatNumber,
      isDownbeat: beatNumber % 4 === 1,
    };
  }).filter(marker => marker.viewportPosition >= 0 && marker.viewportPosition <= containerWidth);

  if (!audioUrl) {
    return (
      <div
        ref={containerRef}
        className="h-[60px] bg-gray-900/50 rounded flex items-center justify-center"
      >
        <p className="text-gray-500 text-xs">No zoomed view</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-b from-gray-900 to-gray-950 shadow-inner"
      style={{
        boxShadow: isPlaying
          ? `inset 0 0 20px ${accentColor === 'primary' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`
          : 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Waveform container with horizontal translation */}
      <div
        ref={containerRef}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: 'transform 0.05s linear',
        }}
      />

      {/* Beat grid markers overlay */}
      {visibleBeatMarkers.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {visibleBeatMarkers.map(({ viewportPosition, isDownbeat }, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0"
              style={{
                left: `${viewportPosition}px`,
                width: isDownbeat ? '3px' : '2px',
                backgroundColor: isDownbeat
                  ? 'rgba(34, 197, 94, 0.9)'
                  : accentColor === 'primary'
                  ? 'rgba(59, 130, 246, 0.6)'
                  : 'rgba(168, 85, 247, 0.6)',
                boxShadow: isDownbeat
                  ? '0 0 8px rgba(34, 197, 94, 0.8)'
                  : '0 0 4px rgba(59, 130, 246, 0.4)',
              }}
            />
          ))}
        </div>
      )}

      {/* Center indicator line - shows current playback position */}
      <div
        className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/60 pointer-events-none z-10"
        style={{ transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
