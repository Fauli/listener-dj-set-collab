/**
 * Waveform - Audio waveform visualization using WaveSurfer.js
 */

import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
  audioUrl: string | null;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  accentColor?: string;
}

export default function Waveform({
  audioUrl,
  currentTime,
  isPlaying,
  onSeek,
  accentColor = 'primary',
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const isSeekingRef = useRef(false);

  // Get colors based on accent - using vibrant, DJ-style colors
  const waveColor = accentColor === 'primary'
    ? 'rgb(59, 130, 246)' // Bright blue for Deck A
    : 'rgb(168, 85, 247)'; // Bright purple for Deck B

  const progressColor = accentColor === 'primary'
    ? 'rgb(96, 165, 250)' // Lighter blue for played portion (blue-400)
    : 'rgb(192, 132, 252)'; // Lighter purple for played portion (purple-400)

  const waveOpacity = '0.35'; // Unplayed portion opacity

  // Create WaveSurfer instance only when audioUrl changes
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Create WaveSurfer instance with enhanced visuals
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: `rgba(${waveColor.match(/\d+/g)?.join(',')}, ${waveOpacity})`, // Unplayed portion - semi-transparent
      progressColor: progressColor, // Played portion - bright and vibrant
      cursorColor: accentColor === 'primary' ? '#3b82f6' : '#a855f7', // Hover cursor color
      barWidth: 3, // Slightly thicker bars for better visibility
      barGap: 1,
      barRadius: 3, // More rounded bars for modern look
      height: 80,
      normalize: true,
      backend: 'MediaElement',
      interact: true,
    });

    // Load audio
    const loadPromise = wavesurfer.load(audioUrl);

    // Handle click to seek
    const handleInteraction = () => {
      isSeekingRef.current = true;
      const time = wavesurfer.getCurrentTime();
      onSeek(time);
      // Reset seeking flag after a short delay
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
    };

    wavesurfer.on('interaction', handleInteraction);

    wavesurferRef.current = wavesurfer;

    return () => {
      // Cleanup: destroy WaveSurfer instance
      // Handle both sync and async errors during cleanup
      setTimeout(async () => {
        try {
          await wavesurfer.destroy();
        } catch (error) {
          // Silently ignore all errors during cleanup (especially AbortError)
        }
      }, 0);
      wavesurferRef.current = null;
    };
  }, [audioUrl]); // Only recreate when audioUrl changes, not when colors or onSeek change

  // Sync playback position with external currentTime (from Howler)
  useEffect(() => {
    if (wavesurferRef.current && !isSeekingRef.current) {
      const duration = wavesurferRef.current.getDuration();
      if (duration > 0) {
        const position = currentTime / duration;
        wavesurferRef.current.seekTo(position);
      }
    }
  }, [currentTime]);

  if (!audioUrl) {
    return (
      <div
        ref={containerRef}
        className="h-20 bg-gray-900/50 rounded flex items-center justify-center"
      >
        <p className="text-gray-500 text-sm">No waveform available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 shadow-inner"
        style={{
          boxShadow: isPlaying
            ? `inset 0 0 20px ${accentColor === 'primary' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`
            : 'inset 0 2px 8px rgba(0, 0, 0, 0.5)'
        }}
      />
    </div>
  );
}
