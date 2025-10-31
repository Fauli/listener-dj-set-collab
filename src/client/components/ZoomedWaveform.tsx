/**
 * ZoomedWaveform - Zoomed-in waveform visualization with custom canvas rendering
 * Uses WaveSurfer for audio decoding, custom canvas for rendering visible window
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [audioPeaks, setAudioPeaks] = useState<Float32Array | null>(null);
  const [peaksPerSecond, setPeaksPerSecond] = useState(100); // How many peaks per second

  // Get colors based on accent
  const waveColor = accentColor === 'primary'
    ? 'rgb(59, 130, 246)'
    : 'rgb(168, 85, 247)';

  // Step 1: Create hidden WaveSurfer instance for audio decoding
  useEffect(() => {
    if (!hiddenContainerRef.current || !audioUrl) return;

    console.log('[ZoomedWaveform] Creating WaveSurfer for audio decoding...');

    const wavesurfer = WaveSurfer.create({
      container: hiddenContainerRef.current,
      height: 0, // Hidden
      backend: 'MediaElement',
    });

    wavesurfer.load(audioUrl);

    // Extract peaks when audio is decoded
    wavesurfer.on('ready', () => {
      console.log('[ZoomedWaveform] Audio ready, extracting peaks...');

      const decodedData = wavesurfer.getDecodedData();
      if (decodedData) {
        const duration = wavesurfer.getDuration();
        const sampleRate = decodedData.sampleRate;
        const numberOfChannels = decodedData.numberOfChannels;

        console.log('[ZoomedWaveform] Audio info:', {
          duration,
          sampleRate,
          numberOfChannels,
          length: decodedData.length,
        });

        // Extract peaks from channel 0 (or merge if stereo)
        const channelData = decodedData.getChannelData(0);

        // Downsample to ~100 peaks per second for efficiency
        const peaksPerSec = 100;
        const totalPeaks = Math.floor(duration * peaksPerSec);
        const samplesPerPeak = Math.floor(channelData.length / totalPeaks);

        const peaks = new Float32Array(totalPeaks);
        for (let i = 0; i < totalPeaks; i++) {
          const start = i * samplesPerPeak;
          const end = start + samplesPerPeak;
          let max = 0;

          // Find max amplitude in this segment
          for (let j = start; j < end && j < channelData.length; j++) {
            max = Math.max(max, Math.abs(channelData[j]));
          }

          peaks[i] = max;
        }

        console.log('[ZoomedWaveform] Extracted peaks:', peaks.length);
        setAudioPeaks(peaks);
        setPeaksPerSecond(peaksPerSec);
      }
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl]);

  // Step 2: Draw canvas based on current time and visible window
  useEffect(() => {
    if (!canvasRef.current || !audioPeaks || duration === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate visible time window (centered on currentTime)
    const halfWindow = zoomWindowSeconds / 2;
    const startTime = Math.max(0, currentTime - halfWindow);
    const endTime = Math.min(duration, currentTime + halfWindow);
    const visibleDuration = endTime - startTime;

    // Calculate which peaks to show
    const startPeakIndex = Math.floor(startTime * peaksPerSecond);
    const endPeakIndex = Math.floor(endTime * peaksPerSecond);
    const visiblePeaks = audioPeaks.slice(startPeakIndex, endPeakIndex);

    // Draw waveform bars
    const barWidth = 3;
    const barGap = 1;
    const barTotalWidth = barWidth + barGap;
    const pixelsPerSecond = width / visibleDuration;

    visiblePeaks.forEach((peak, i) => {
      const x = (i / peaksPerSecond) * pixelsPerSecond;
      const barHeight = peak * (height * 0.8); // Use 80% of height
      const y = (height - barHeight) / 2;

      ctx.fillStyle = waveColor;
      ctx.fillRect(x, y, barWidth, barHeight);
    });

  }, [currentTime, duration, audioPeaks, peaksPerSecond, zoomWindowSeconds, waveColor]);

  // Calculate beat markers
  const visibleWindowStart = Math.max(0, currentTime - zoomWindowSeconds / 2);
  const visibleWindowEnd = Math.min(duration, currentTime + zoomWindowSeconds / 2);

  const beatMarkers =
    firstBeatTime !== null && bpm !== null && duration > 0
      ? getBeatsInRange(visibleWindowStart, visibleWindowEnd, { firstBeatTime, bpm, rate })
      : [];

  const containerWidth = canvasRef.current?.offsetWidth || 0;
  const pixelsPerSecond = containerWidth / zoomWindowSeconds;

  // Position beat markers relative to current time
  const visibleBeatMarkers = beatMarkers.map((beatTime) => {
    const offsetFromStart = beatTime - visibleWindowStart;
    const viewportPosition = offsetFromStart * pixelsPerSecond;

    const beatNumber = Math.round((beatTime - firstBeatTime!) / (60 / (bpm! * rate))) + 1;
    return {
      time: beatTime,
      viewportPosition,
      beatNumber,
      isDownbeat: beatNumber % 4 === 1,
    };
  }).filter(marker => marker.viewportPosition >= 0 && marker.viewportPosition <= containerWidth);

  // Handle canvas click to seek
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickRatio = x / rect.width;

    // Calculate time based on visible window
    const halfWindow = zoomWindowSeconds / 2;
    const startTime = Math.max(0, currentTime - halfWindow);
    const endTime = Math.min(duration, currentTime + halfWindow);
    const visibleDuration = endTime - startTime;

    const newTime = startTime + (clickRatio * visibleDuration);
    onSeek(Math.max(0, Math.min(newTime, duration)));
  };

  if (!audioUrl) {
    return (
      <div className="h-[60px] bg-gray-900/50 rounded flex items-center justify-center">
        <p className="text-gray-500 text-xs">No zoomed view</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg bg-gradient-to-b from-gray-900 to-gray-950 shadow-inner overflow-hidden"
      style={{
        boxShadow: isPlaying
          ? `inset 0 0 20px ${accentColor === 'primary' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`
          : 'inset 0 2px 8px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Hidden container for WaveSurfer audio decoding */}
      <div ref={hiddenContainerRef} style={{ display: 'none' }} />

      {/* Custom canvas for waveform rendering */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: '60px',
          cursor: 'pointer',
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

      {/* Center indicator line */}
      <div
        className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/60 pointer-events-none z-10"
        style={{ transform: 'translateX(-50%)' }}
      />

      {/* Loading indicator */}
      {!audioPeaks && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Decoding audio...
          </div>
        </div>
      )}
    </div>
  );
}
