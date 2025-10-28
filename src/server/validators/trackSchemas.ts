/**
 * Validation schemas for track and playlist operations
 */

import { z } from 'zod';

/**
 * Schema for creating a new track
 */
export const createTrackSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Track title is required')
    .max(200, 'Track title must be 200 characters or less'),
  artist: z
    .string()
    .trim()
    .min(1, 'Artist name is required')
    .max(200, 'Artist name must be 200 characters or less'),
  bpm: z
    .number()
    .int('BPM must be an integer')
    .min(1, 'BPM must be at least 1')
    .max(300, 'BPM must be 300 or less')
    .optional(),
  key: z
    .string()
    .trim()
    .max(10, 'Key must be 10 characters or less')
    .optional(),
  energy: z
    .number()
    .int('Energy must be an integer')
    .min(1, 'Energy must be between 1 and 10')
    .max(10, 'Energy must be between 1 and 10')
    .optional(),
  sourceURI: z
    .string()
    .trim()
    .url('Source URI must be a valid URL')
    .max(500, 'Source URI must be 500 characters or less')
    .optional(),
});

/**
 * Schema for updating track metadata
 */
export const updateTrackSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Track title is required')
    .max(200, 'Track title must be 200 characters or less')
    .optional(),
  artist: z
    .string()
    .trim()
    .min(1, 'Artist name is required')
    .max(200, 'Artist name must be 200 characters or less')
    .optional(),
  bpm: z
    .number()
    .int('BPM must be an integer')
    .min(1, 'BPM must be at least 1')
    .max(300, 'BPM must be 300 or less')
    .nullable()
    .optional(),
  key: z
    .string()
    .trim()
    .max(10, 'Key must be 10 characters or less')
    .nullable()
    .optional(),
  energy: z
    .number()
    .int('Energy must be an integer')
    .min(1, 'Energy must be between 1 and 10')
    .max(10, 'Energy must be between 1 and 10')
    .nullable()
    .optional(),
  sourceURI: z
    .string()
    .trim()
    .url('Source URI must be a valid URL')
    .max(500, 'Source URI must be 500 characters or less')
    .nullable()
    .optional(),
});

/**
 * Schema for adding track to playlist
 */
export const addToPlaylistSchema = z.object({
  trackId: z.string().uuid('Track ID must be a valid UUID'),
  position: z
    .number()
    .int('Position must be an integer')
    .min(0, 'Position must be 0 or greater'),
  note: z
    .string()
    .trim()
    .max(500, 'Note must be 500 characters or less')
    .optional(),
});

/**
 * Schema for updating set entry
 */
export const updateSetEntrySchema = z.object({
  note: z
    .string()
    .trim()
    .max(500, 'Note must be 500 characters or less')
    .optional(),
  position: z
    .number()
    .int('Position must be an integer')
    .min(0, 'Position must be 0 or greater')
    .optional(),
});

/**
 * Schema for reordering (updating just position)
 */
export const reorderSchema = z.object({
  newPosition: z
    .number()
    .int('Position must be an integer')
    .min(0, 'Position must be 0 or greater'),
});

/**
 * Schema for track search
 */
export const searchTracksSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'Search query must be at least 1 character')
    .max(100, 'Search query must be 100 characters or less'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(50),
});
