/**
 * Track and playlist management routes
 */

import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  addToPlaylistSchema,
  updateSetEntrySchema,
  reorderSchema,
  createTrackSchema,
} from '../validators/trackSchemas.js';
import {
  addTrackToPlaylist,
  getPlaylistByRoom,
  getSetEntryById,
  updateSetEntry,
  removeTrackFromPlaylist,
  updatePosition,
} from '../models/SetEntry.js';
import { createTrack } from '../models/Track.js';
import { getRoomById } from '../models/Room.js';

const router = Router();

/**
 * POST /api/rooms/:roomId/tracks
 * Add a track to the room's playlist
 * Creates track if it doesn't exist, then adds to playlist
 */
router.post('/:roomId/tracks', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    // Verify room exists
    const room = await getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Validate track data
    const trackData = createTrackSchema.parse(req.body.track);

    // Validate playlist data (position and note only, trackId will be set after track creation)
    const position = typeof req.body.position === 'number'
      ? req.body.position
      : 0;
    const note = req.body.note;

    // Create the track first
    const track = await createTrack(trackData);

    // Now validate the complete playlist data including trackId
    const playlistData = addToPlaylistSchema.parse({
      trackId: track.id,
      position,
      note,
    });

    // Add to playlist
    const setEntry = await addTrackToPlaylist({
      roomId,
      trackId: playlistData.trackId,
      position: playlistData.position,
      note: playlistData.note,
    });

    res.status(201).json({ setEntry });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('Error adding track to playlist:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/rooms/:roomId/tracks
 * Get the complete playlist for a room
 */
router.get('/:roomId/tracks', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    // Verify room exists
    const room = await getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const playlist = await getPlaylistByRoom(roomId);

    res.json({ tracks: playlist });
  } catch (error) {
    console.error('Error getting playlist:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/rooms/:roomId/tracks/:entryId
 * Get a specific set entry
 */
router.get('/:roomId/tracks/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;

    const setEntry = await getSetEntryById(entryId);

    if (!setEntry) {
      return res.status(404).json({ error: 'Track not found in playlist' });
    }

    res.json({ setEntry });
  } catch (error) {
    console.error('Error getting set entry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/rooms/:roomId/tracks/:entryId
 * Update a set entry (note or metadata)
 */
router.put('/:roomId/tracks/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;

    // Validate request body
    const updates = updateSetEntrySchema.parse(req.body);

    const setEntry = await updateSetEntry(entryId, updates);

    res.json({ setEntry });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('Error updating set entry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/rooms/:roomId/tracks/:entryId/reorder
 * Reorder a track in the playlist
 */
router.put('/:roomId/tracks/:entryId/reorder', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;

    // Validate request body
    const { newPosition } = reorderSchema.parse(req.body);

    const setEntry = await updatePosition(entryId, newPosition);

    res.json({ setEntry });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    console.error('Error reordering track:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/rooms/:roomId/tracks/:entryId
 * Remove a track from the playlist
 */
router.delete('/:roomId/tracks/:entryId', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;

    const setEntry = await removeTrackFromPlaylist(entryId);

    res.json({
      message: 'Track removed from playlist',
      setEntry,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Set entry not found') {
      return res.status(404).json({ error: 'Track not found in playlist' });
    }

    console.error('Error removing track from playlist:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
