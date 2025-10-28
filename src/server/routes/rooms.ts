/**
 * Room REST API endpoints
 */

import express, { Request, Response } from 'express';
import { ZodError } from 'zod';
import { createRoomSchema, roomIdSchema } from '../validators/roomSchemas.js';
import { createRoom, getRoomById, deleteRoom, getAllRooms } from '../models/Room.js';

const router = express.Router();

/**
 * POST /api/rooms
 * Create a new room
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
 * GET /api/rooms/:id
 * Get room by ID
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
 * DELETE /api/rooms/:id
 * Delete room (owner only - auth will be added later)
 * TODO: Add authentication and authorization middleware (Phase 2.3)
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
 * GET /api/rooms
 * Get all rooms (for future listing feature)
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

export default router;
