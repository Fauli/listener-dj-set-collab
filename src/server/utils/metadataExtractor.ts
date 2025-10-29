/**
 * Metadata extraction utility for audio files
 * Extracts ID3 tags from audio files with fallback to filename parsing
 */

import { parseFile } from 'music-metadata';
import path from 'path';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  bpm?: number;
  key?: string;
  year?: number;
  duration?: number;
  format?: string;
  extractedFrom: 'id3' | 'filename';
}

/**
 * Parse filename to extract title and artist
 * Expected formats:
 * - "Artist - Title.mp3"
 * - "Title.mp3" (artist will be "Unknown Artist")
 */
function parseFilename(filename: string): { title: string; artist: string } {
  // Remove file extension
  const nameWithoutExt = path.parse(filename).name;

  // Try to split by " - " (common format: "Artist - Title")
  const parts = nameWithoutExt.split(' - ').map((p) => p.trim());

  if (parts.length >= 2) {
    return {
      artist: parts[0],
      title: parts.slice(1).join(' - '), // In case title contains " - "
    };
  }

  // Fallback: use entire name as title
  return {
    artist: 'Unknown Artist',
    title: nameWithoutExt,
  };
}

/**
 * Extract BPM from comment field or description
 * Many DJ tools store BPM in comments like "BPM: 128" or "[128]"
 */
function extractBPMFromText(text?: string): number | undefined {
  if (!text) return undefined;

  // Match patterns like "BPM: 128", "128 BPM", "[128]", "bpm:128"
  const bpmMatch = text.match(/(?:bpm[:\s]*|^\[)(\d{2,3})(?:\]|$|\s)/i);
  if (bpmMatch) {
    const bpm = parseInt(bpmMatch[1], 10);
    if (bpm >= 60 && bpm <= 300) {
      return bpm;
    }
  }

  return undefined;
}

/**
 * Extract musical key from comment or description
 * Common formats: "Am", "C#m", "Db", "12A" (Camelot)
 */
function extractKeyFromText(text?: string): string | undefined {
  if (!text) return undefined;

  // Match patterns like "Key: Am", "Am", "C#m", "12A"
  const keyMatch = text.match(/(?:key[:\s]*)?([A-G][#b]?(?:m|min|maj)?|\d{1,2}[AB])/i);
  if (keyMatch) {
    return keyMatch[1];
  }

  return undefined;
}

/**
 * Extract metadata from audio file
 * @param filePath - Path to the audio file
 * @param originalFilename - Original filename (for fallback parsing)
 * @returns Extracted metadata
 */
export async function extractMetadata(
  filePath: string,
  originalFilename: string
): Promise<ExtractedMetadata> {
  try {
    // Parse audio file metadata
    const metadata = await parseFile(filePath);

    // Extract common fields
    const common = metadata.common;
    const format = metadata.format;

    // Try to get BPM from various sources
    let bpm: number | undefined = undefined;

    // Some formats store BPM directly
    if (common.bpm) {
      bpm = Math.round(common.bpm);
    }

    // Check comment field for BPM
    if (!bpm && common.comment) {
      const comments = Array.isArray(common.comment) ? common.comment.join(' ') : common.comment;
      bpm = extractBPMFromText(comments);
    }

    // Try to extract key
    let key: string | undefined = common.key;
    if (!key && common.comment) {
      const comments = Array.isArray(common.comment) ? common.comment.join(' ') : common.comment;
      key = extractKeyFromText(comments);
    }

    // Use ID3 tags if available, otherwise fall back to filename
    const hasValidID3 = common.title && common.artist;

    if (hasValidID3) {
      return {
        title: common.title!,
        artist: common.artist!,
        bpm,
        key,
        year: common.year,
        duration: format.duration ? Math.round(format.duration) : undefined,
        format: format.container,
        extractedFrom: 'id3',
      };
    } else {
      // Fallback to filename parsing
      const parsed = parseFilename(originalFilename);
      return {
        ...parsed,
        bpm,
        key,
        year: common.year,
        duration: format.duration ? Math.round(format.duration) : undefined,
        format: format.container,
        extractedFrom: 'filename',
      };
    }
  } catch (error) {
    console.error('Error extracting metadata:', error);

    // Complete fallback: parse filename only
    const parsed = parseFilename(originalFilename);
    return {
      ...parsed,
      extractedFrom: 'filename',
    };
  }
}

/**
 * Check if file is a supported audio format
 */
export function isSupportedAudioFormat(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  const supportedFormats = ['.mp3', '.wav', '.flac', '.m4a', '.aiff', '.aif'];
  return supportedFormats.includes(ext);
}

/**
 * Get MIME type for audio file
 */
export function getAudioMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.aiff': 'audio/aiff',
    '.aif': 'audio/aiff',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
