/**
 * Audio transcoding utility using FFmpeg
 * Converts AIFF files to WAV for browser compatibility
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { execSync } from 'child_process';

// Configure FFmpeg path - try common locations
// This helps fluent-ffmpeg find ffmpeg
const ffmpegPaths = [
  '/opt/homebrew/bin/ffmpeg', // Homebrew on Apple Silicon
  '/usr/local/bin/ffmpeg',     // Homebrew on Intel Mac
  '/usr/bin/ffmpeg',           // Linux standard location
];

let ffmpegFound = false;
for (const ffmpegPath of ffmpegPaths) {
  try {
    execSync(`test -f ${ffmpegPath}`, { stdio: 'ignore' });
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.info(`✅ FFmpeg found at: ${ffmpegPath}`);
    ffmpegFound = true;
    break;
  } catch {
    // Path doesn't exist, try next one
  }
}

if (!ffmpegFound) {
  console.warn('⚠️  FFmpeg not found at standard locations. Transcoding AIFF files may fail.');
  console.warn('   Install FFmpeg: brew install ffmpeg');
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
