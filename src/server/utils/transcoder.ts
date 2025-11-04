/**
 * Audio transcoding utility using FFmpeg
 * Converts AIFF files to WAV for browser compatibility
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

// Configure FFmpeg path (Linux/macOS standard location)
// This helps fluent-ffmpeg find ffmpeg even if it's not in PATH
try {
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
} catch (error) {
  console.warn('Could not set explicit ffmpeg path, using system PATH:', error);
}

/**
 * Transcodes an AIFF audio file to WAV format
 * @param inputPath - Path to the input AIFF file
 * @returns Promise resolving to the path of the transcoded WAV file
 * @throws Error if transcoding fails
 */
export async function transcodeAiffToWav(inputPath: string): Promise<string> {
  const ext = path.extname(inputPath).toLowerCase();

  // Validate input is AIFF format
  if (ext !== '.aiff' && ext !== '.aif') {
    throw new Error(`Invalid input format: ${ext}. Expected .aiff or .aif`);
  }

  // Generate output path (replace extension with .wav)
  const outputPath = inputPath.replace(/\.(aiff|aif)$/i, '.wav');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le') // Standard 16-bit PCM WAV
      .on('end', async () => {
        try {
          // Clean up original AIFF file after successful conversion
          await fs.unlink(inputPath);
          resolve(outputPath);
        } catch (cleanupError) {
          // Still resolve with output path even if cleanup fails
          console.error('Warning: Failed to delete original AIFF file:', cleanupError);
          resolve(outputPath);
        }
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg transcoding failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Checks if a file needs transcoding based on its extension
 * @param filename - The filename to check
 * @returns true if the file is AIFF format
 */
export function needsTranscoding(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ext === '.aiff' || ext === '.aif';
}
