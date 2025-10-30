/**
 * Beat Grid Utilities
 * Calculate beat positions and quantization based on BPM and first beat time
 */

export interface BeatGridParams {
  firstBeatTime: number; // Time in seconds where beat 1 occurs
  bpm: number; // Beats per minute
  rate?: number; // Playback rate (default 1.0)
}

/**
 * Calculate the time of a specific beat number
 * @param beatNumber - Beat number (1, 2, 3, ...)
 * @param params - Beat grid parameters
 * @returns Time in seconds
 */
export function getBeatTime(beatNumber: number, params: BeatGridParams): number {
  const { firstBeatTime, bpm, rate = 1.0 } = params;
  const beatDuration = 60 / (bpm * rate); // Seconds per beat (adjusted for rate)
  return firstBeatTime + (beatNumber - 1) * beatDuration;
}

/**
 * Calculate which beat number a given time is closest to
 * @param time - Time in seconds
 * @param params - Beat grid parameters
 * @returns Beat number (1, 2, 3, ...)
 */
export function getClosestBeat(time: number, params: BeatGridParams): number {
  const { firstBeatTime, bpm, rate = 1.0 } = params;
  const beatDuration = 60 / (bpm * rate);
  const beatNumber = Math.round((time - firstBeatTime) / beatDuration) + 1;
  return Math.max(1, beatNumber); // Ensure at least beat 1
}

/**
 * Quantize a time to the nearest beat
 * @param time - Time in seconds to quantize
 * @param params - Beat grid parameters
 * @returns Quantized time in seconds
 */
export function quantizeToNearestBeat(time: number, params: BeatGridParams): number {
  const beatNumber = getClosestBeat(time, params);
  return getBeatTime(beatNumber, params);
}

/**
 * Get all beat times within a time range
 * @param startTime - Start of range in seconds
 * @param endTime - End of range in seconds
 * @param params - Beat grid parameters
 * @returns Array of beat times in seconds
 */
export function getBeatsInRange(
  startTime: number,
  endTime: number,
  params: BeatGridParams
): number[] {
  const { firstBeatTime, bpm, rate = 1.0 } = params;
  const beatDuration = 60 / (bpm * rate);

  // Find first beat in range
  const firstBeatNumber = Math.max(1, Math.ceil((startTime - firstBeatTime) / beatDuration) + 1);

  // Collect all beats in range
  const beats: number[] = [];
  let beatNumber = firstBeatNumber;
  let beatTime = getBeatTime(beatNumber, params);

  while (beatTime <= endTime) {
    if (beatTime >= startTime) {
      beats.push(beatTime);
    }
    beatNumber++;
    beatTime = getBeatTime(beatNumber, params);
  }

  return beats;
}

/**
 * Get the current bar number (assuming 4/4 time signature)
 * @param time - Time in seconds
 * @param params - Beat grid parameters
 * @returns Bar number (1, 2, 3, ...)
 */
export function getCurrentBar(time: number, params: BeatGridParams): number {
  const beatNumber = getClosestBeat(time, params);
  return Math.ceil(beatNumber / 4);
}

/**
 * Get the current beat within the bar (1-4 in 4/4 time)
 * @param time - Time in seconds
 * @param params - Beat grid parameters
 * @returns Beat within bar (1, 2, 3, or 4)
 */
export function getBeatInBar(time: number, params: BeatGridParams): number {
  const beatNumber = getClosestBeat(time, params);
  return ((beatNumber - 1) % 4) + 1;
}
