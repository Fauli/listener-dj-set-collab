/**
 * Beat Detection Utilities
 * Automatic beat detection using transient analysis
 */

export interface DetectedBeat {
  time: number; // Time in seconds
  energy: number; // Energy level (0-1)
}

export interface BeatDetectionResult {
  firstBeatTime: number;
  detectedBpm: number;
  confidence: number; // 0-1, how confident we are in the detection
  beats: DetectedBeat[];
}

/**
 * Calculate RMS (Root Mean Square) energy for a window of samples
 */
function calculateRMS(samples: Float32Array, start: number, windowSize: number): number {
  let sum = 0;
  const end = Math.min(start + windowSize, samples.length);
  for (let i = start; i < end; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / windowSize);
}

/**
 * Detect beats in an audio buffer using energy-based transient detection
 */
export async function detectBeats(
  audioBuffer: AudioBuffer,
  options: {
    maxDuration?: number; // Max seconds to analyze (default: 30)
    minBpm?: number; // Minimum BPM to consider (default: 80)
    maxBpm?: number; // Maximum BPM to consider (default: 180)
    sensitivity?: number; // Detection sensitivity 0-1 (default: 0.7)
  } = {}
): Promise<BeatDetectionResult> {
  const {
    maxDuration = 30,
    minBpm = 80,
    maxBpm = 180,
    sensitivity = 0.7,
  } = options;

  // Get audio data (mix down to mono if stereo)
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0); // Use first channel
  const maxSamples = Math.min(
    channelData.length,
    Math.floor(maxDuration * sampleRate)
  );

  // Window size for energy calculation (about 50ms)
  const windowSize = Math.floor(sampleRate * 0.05);
  const hopSize = Math.floor(windowSize / 2); // 50% overlap

  // Calculate energy for each window
  const energies: Array<{ time: number; energy: number }> = [];
  for (let i = 0; i < maxSamples - windowSize; i += hopSize) {
    const energy = calculateRMS(channelData, i, windowSize);
    energies.push({
      time: i / sampleRate,
      energy,
    });
  }

  if (energies.length === 0) {
    throw new Error('No audio data to analyze');
  }

  // Find peaks in energy (potential beats)
  const meanEnergy = energies.reduce((sum, e) => sum + e.energy, 0) / energies.length;
  const threshold = meanEnergy * (1 + sensitivity);

  const peaks: DetectedBeat[] = [];
  for (let i = 1; i < energies.length - 1; i++) {
    const prev = energies[i - 1].energy;
    const curr = energies[i].energy;
    const next = energies[i + 1].energy;

    // Peak: current is higher than neighbors and above threshold
    if (curr > prev && curr > next && curr > threshold) {
      peaks.push({
        time: energies[i].time,
        energy: curr,
      });
    }
  }

  if (peaks.length < 4) {
    throw new Error('Not enough beats detected. Try adjusting sensitivity or check audio.');
  }

  // Filter peaks to find likely beats
  // Beats should be somewhat regularly spaced
  const minBeatInterval = 60 / maxBpm;
  const maxBeatInterval = 60 / minBpm;

  const beats: DetectedBeat[] = [peaks[0]]; // Start with first peak
  for (let i = 1; i < peaks.length; i++) {
    const timeSinceLastBeat = peaks[i].time - beats[beats.length - 1].time;

    // Only add if spacing is reasonable
    if (timeSinceLastBeat >= minBeatInterval && timeSinceLastBeat <= maxBeatInterval) {
      beats.push(peaks[i]);
    }
  }

  if (beats.length < 4) {
    throw new Error('Not enough regular beats found. Track may have irregular rhythm.');
  }

  // Calculate BPM from average spacing between beats
  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i].time - beats[i - 1].time);
  }

  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const detectedBpm = 60 / avgInterval;

  // Calculate confidence based on consistency of intervals
  const intervalVariance =
    intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
    intervals.length;
  const intervalStdDev = Math.sqrt(intervalVariance);
  const confidence = Math.max(0, Math.min(1, 1 - intervalStdDev / avgInterval));

  return {
    firstBeatTime: beats[0].time,
    detectedBpm: Math.round(detectedBpm * 10) / 10, // Round to 1 decimal
    confidence,
    beats: beats.slice(0, 20), // Return first 20 beats for verification
  };
}

/**
 * Fetch and decode audio from URL
 */
export async function fetchAndDecodeAudio(
  audioUrl: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}
