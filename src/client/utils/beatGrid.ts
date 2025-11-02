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

/**
 * Calculate beat phase (0-1 representing position within current beat)
 * @param time - Time in seconds
 * @param params - Beat grid parameters
 * @returns Object with beatNumber (which beat we're on) and phase (0-1 within that beat)
 */
export function getBeatPhase(time: number, params: BeatGridParams): { beatNumber: number; phase: number } {
  const { firstBeatTime, bpm, rate = 1.0 } = params;
  const beatDuration = 60 / (bpm * rate);
  const timeSinceFirstBeat = time - firstBeatTime;
  const absoluteBeatNumber = timeSinceFirstBeat / beatDuration + 1;
  const beatNumber = Math.floor(absoluteBeatNumber);
  const phase = absoluteBeatNumber - beatNumber; // 0-1 within current beat

  return {
    beatNumber: Math.max(1, beatNumber),
    phase: Math.max(0, Math.min(1, phase)),
  };
}

/**
 * Calculate the aligned position for beat-synced playback
 * Given a source track's current position, find where the target track should seek
 * to have its beats aligned with the source track
 *
 * @param sourceTime - Current playback time of the source track (seconds)
 * @param sourceParams - Beat grid parameters of the source track
 * @param targetParams - Beat grid parameters of the target track
 * @returns Time in seconds where the target track should seek to for beat alignment
 */
export function calculateAlignedPosition(
  sourceTime: number,
  sourceParams: BeatGridParams,
  targetParams: BeatGridParams
): number {
  // Get the source track's current beat phase
  const sourcePhase = getBeatPhase(sourceTime, sourceParams);

  // Calculate target track's beat duration
  const targetBeatDuration = 60 / (targetParams.bpm * (targetParams.rate || 1.0));

  // Find the nearest beat in the target track
  // We want to start at a beat position that matches the source's phase
  const targetBeatNumber = Math.round(sourcePhase.beatNumber);

  // Calculate the time of that beat in the target track
  const targetBeatTime = getBeatTime(targetBeatNumber, targetParams);

  // Add the phase offset to align within the beat
  const alignedPosition = targetBeatTime + (sourcePhase.phase * targetBeatDuration);

  return Math.max(0, alignedPosition); // Ensure we don't go negative
}
