/**
 * Room REST API endpoints
 */

import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import { ZodError } from 'zod';
import { createRoomSchema, roomIdSchema } from '../validators/roomSchemas.js';
import { createRoom, getRoomById, deleteRoom, getAllRooms } from '../models/Room.js';
import { updateSetEntry, getSetEntryById } from '../models/SetEntry.js';

// Factory function to create router with io instance
export function createRoomsRouter(io: Server) {
  const router = express.Router();

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     description: Creates a new DJ room with a unique ID and returns a joinable link
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Room name
 *                 example: "Friday Night Mix"
 *               ownerId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID of the room creator
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *                 joinLink:
 *                   type: string
 *                   description: Full URL to join the room
 *                   example: "http://localhost:3000/rooms/123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       message:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = createRoomSchema.parse(req.body);

    // Create room
    const room = await createRoom(validatedData);

    // Return created room with join link
    res.status(201).json({
      room,
      joinLink: `${req.protocol}://${req.get('host')}/rooms/${room.id}`,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Handle other errors
    // TODO: Replace with structured logger (Winston/Pino) before production
    console.error('Error creating room:', error);
    res.status(500).json({
      error: 'Failed to create room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     description: Retrieves detailed information about a specific room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Room found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid room ID format
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Validate room ID
    const { id } = roomIdSchema.parse({ id: req.params.id });

    // Get room
    const room = await getRoomById(id);

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    res.json({ room });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid room ID',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // TODO: Replace with structured logger (Winston/Pino) before production
    console.error('Error fetching room:', error);
    res.status(500).json({
      error: 'Failed to fetch room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     description: Deletes a room and all associated data (playlists, tracks, sessions). Owner authorization will be added in Phase 2.3.
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID to delete
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Room deleted successfully"
 *                 room:
 *                   $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Invalid room ID format
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
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Validate room ID
    const { id } = roomIdSchema.parse({ id: req.params.id });

    // TODO: Check if user is room owner before allowing delete

    // Delete room
    const deletedRoom = await deleteRoom(id);

    res.json({
      message: 'Room deleted successfully',
      room: deletedRoom,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Invalid room ID',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Handle Prisma "not found" error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    // TODO: Replace with structured logger (Winston/Pino) before production
    console.error('Error deleting room:', error);
    res.status(500).json({
      error: 'Failed to delete room',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: List all rooms
 *     description: Retrieves a list of all rooms with optional limit
 *     tags: [Rooms]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of rooms to return
 *         example: 20
 *     responses:
 *       200:
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rooms:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 *                 count:
 *                   type: integer
 *                   description: Number of rooms returned
 *                   example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const rooms = await getAllRooms(limit);

    res.json({ rooms, count: rooms.length });
  } catch (error) {
    // TODO: Replace with structured logger (Winston/Pino) before production
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      error: 'Failed to fetch rooms',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/rooms/{roomId}/tracks/{trackId}:
 *   put:
 *     summary: Update playlist track (SetEntry)
 *     description: Updates a track in the room's playlist (e.g., cue points, note). Broadcasts update to all clients via WebSocket.
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: path
 *         name: trackId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: SetEntry ID (playlist track ID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cuePoints:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: number
 *                     nullable: true
 *                   end:
 *                     type: number
 *                     nullable: true
 *                   A:
 *                     type: number
 *                     nullable: true
 *                   B:
 *                     type: number
 *                     nullable: true
 *               note:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Track updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 setEntry:
 *                   $ref: '#/components/schemas/SetEntry'
 *       404:
 *         description: Track not found
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
router.put('/:roomId/tracks/:trackId', async (req: Request, res: Response) => {
  try {
    const { roomId, trackId } = req.params;
    const updates = req.body;

    // Update the SetEntry
    const updatedEntry = await updateSetEntry(trackId, updates);

    // Fetch complete entry with track data for broadcast
    const fullEntry = await getSetEntryById(trackId);

    if (!fullEntry) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Broadcast update to all clients in the room via WebSocket
    io.to(roomId).emit('playlist:track-updated', {
      setEntry: fullEntry,
    });

    console.log(`Track ${trackId} updated in room ${roomId}:`, updates);

    res.json({ setEntry: updatedEntry });
  } catch (error) {
    console.error('Error updating track:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.status(500).json({
      error: 'Failed to update track',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

  return router;
}
