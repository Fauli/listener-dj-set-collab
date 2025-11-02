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
 * @swagger
 * /api/rooms/{roomId}/tracks:
 *   post:
 *     summary: Add track to playlist
 *     description: Creates a new track and adds it to the room's playlist at the specified position
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - track
 *             properties:
 *               track:
 *                 type: object
 *                 required:
 *                   - title
 *                   - artist
 *                 properties:
 *                   title:
 *                     type: string
 *                     example: "Summer Vibes"
 *                   artist:
 *                     type: string
 *                     example: "DJ Example"
 *                   bpm:
 *                     type: number
 *                     example: 128
 *                   key:
 *                     type: string
 *                     example: "8A"
 *                   energy:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10
 *                     example: 7
 *                   genre:
 *                     type: string
 *                     example: "House"
 *                   year:
 *                     type: integer
 *                     example: 2023
 *                   duration:
 *                     type: number
 *                     example: 245.5
 *                   audioUrl:
 *                     type: string
 *                     example: "/api/upload/track-id/audio"
 *               position:
 *                 type: integer
 *                 description: Position in playlist (0-indexed)
 *                 example: 0
 *               note:
 *                 type: string
 *                 description: DJ notes for this track
 *                 example: "Drop after vocal intro"
 *     responses:
 *       201:
 *         description: Track added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 setEntry:
 *                   $ref: '#/components/schemas/SetEntry'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/rooms/{roomId}/tracks:
 *   get:
 *     summary: Get room playlist
 *     description: Retrieves the complete playlist for a room, ordered by position
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Playlist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tracks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SetEntry'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/rooms/{roomId}/tracks/{entryId}:
 *   get:
 *     summary: Get playlist entry
 *     description: Retrieves a specific entry from the playlist
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Set entry ID
 *     responses:
 *       200:
 *         description: Entry found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 setEntry:
 *                   $ref: '#/components/schemas/SetEntry'
 *       404:
 *         description: Entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/rooms/{roomId}/tracks/{entryId}:
 *   put:
 *     summary: Update playlist entry
 *     description: Updates track note or cue points for a playlist entry
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Set entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 description: DJ notes
 *                 example: "Drop after vocal intro"
 *               cuePoints:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: number
 *                     nullable: true
 *                     example: 30.5
 *                   end:
 *                     type: number
 *                     nullable: true
 *                     example: 180.0
 *                   A:
 *                     type: number
 *                     nullable: true
 *                     example: 65.2
 *                   B:
 *                     type: number
 *                     nullable: true
 *                     example: 120.8
 *     responses:
 *       200:
 *         description: Entry updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 setEntry:
 *                   $ref: '#/components/schemas/SetEntry'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/rooms/{roomId}/tracks/{entryId}/reorder:
 *   put:
 *     summary: Reorder track in playlist
 *     description: Changes the position of a track in the playlist. Other tracks are automatically shifted.
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Set entry ID to move
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPosition
 *             properties:
 *               newPosition:
 *                 type: integer
 *                 minimum: 0
 *                 description: New position in playlist (0-indexed)
 *                 example: 3
 *     responses:
 *       200:
 *         description: Track reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 setEntry:
 *                   $ref: '#/components/schemas/SetEntry'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @swagger
 * /api/rooms/{roomId}/tracks/{entryId}:
 *   delete:
 *     summary: Remove track from playlist
 *     description: Removes a track from the playlist and automatically shifts remaining tracks
 *     tags: [Tracks]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: path
 *         name: entryId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Set entry ID
 *     responses:
 *       200:
 *         description: Track removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Track removed from playlist"
 *                 setEntry:
 *                   $ref: '#/components/schemas/SetEntry'
 *       404:
 *         description: Entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
