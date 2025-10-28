/**
 * Zod validation schemas for room operations
 */

import { z } from 'zod';

/**
 * Schema for creating a new room
 */
export const createRoomSchema = z.object({
  name: z
    .string()
    .trim() // Trim BEFORE validation
    .min(1, 'Room name is required')
    .max(100, 'Room name must be 100 characters or less'),
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
});

/**
 * Schema for room ID parameter
 */
export const roomIdSchema = z.object({
  id: z.string().uuid('Room ID must be a valid UUID'),
});

/**
 * Schema for updating room (future use)
 */
export const updateRoomSchema = z.object({
  name: z
    .string()
    .trim() // Trim BEFORE validation
    .min(1, 'Room name is required')
    .max(100, 'Room name must be 100 characters or less')
    .optional(),
});

// Export types derived from schemas
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type RoomIdParam = z.infer<typeof roomIdSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
