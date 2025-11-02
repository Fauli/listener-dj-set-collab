/**
 * SetEntry model service
 * Handles playlist management - adding, removing, and reordering tracks in rooms
 */

import { prisma } from '../db/client.js';

export interface AddTrackToPlaylistData {
  roomId: string;
  trackId: string;
  position: number;
  note?: string;
}

export interface CuePoints {
  start: number | null;
  end: number | null;
  A: number | null;
  B: number | null;
}

export interface UpdateSetEntryData {
  note?: string;
  position?: number;
  cuePoints?: CuePoints;
}

/**
 * Add track to room playlist at specific position
 * Handles position conflicts by shifting existing tracks
 * Retries with next position if conflict occurs (for concurrent inserts)
 */
export async function addTrackToPlaylist(data: AddTrackToPlaylistData) {
  const MAX_RETRIES = 10;
  let currentPosition = data.position;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use transaction to make shift + insert atomic (prevents race conditions)
      return await prisma.$transaction(async (tx) => {
        // Shift existing tracks at or after this position
        await tx.setEntry.updateMany({
          where: {
            roomId: data.roomId,
            position: {
              gte: currentPosition,
            },
          },
          data: {
            position: {
              increment: 1,
            },
          },
        });

        // Create new set entry
        const setEntry = await tx.setEntry.create({
          data: {
            roomId: data.roomId,
            trackId: data.trackId,
            position: currentPosition,
            note: data.note,
          },
          include: {
            track: true,
          },
        });

        return setEntry;
      });
    } catch (error) {
      // Check if it's a unique constraint violation
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        // Unique constraint failed - try next position
        lastError = error as unknown as Error;
        currentPosition++;
        console.log(
          `Position conflict at ${currentPosition - 1}, retrying with position ${currentPosition} (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        continue;
      }
      // Other error - throw immediately
      throw error;
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Failed to add track after maximum retries');
}

/**
 * Get complete playlist for a room (ordered by position)
 */
export async function getPlaylistByRoom(roomId: string) {
  const setEntries = await prisma.setEntry.findMany({
    where: {
      roomId,
    },
    include: {
      track: true,
    },
    orderBy: {
      position: 'asc',
    },
  });

  return setEntries;
}

/**
 * Get single set entry by ID
 */
export async function getSetEntryById(entryId: string) {
  const setEntry = await prisma.setEntry.findUnique({
    where: {
      id: entryId,
    },
    include: {
      track: true,
    },
  });

  return setEntry;
}

/**
 * Update set entry (note or position)
 */
export async function updateSetEntry(entryId: string, data: UpdateSetEntryData) {
  const setEntry = await prisma.setEntry.update({
    where: {
      id: entryId,
    },
    data: {
      ...data,
      cuePoints: data.cuePoints as any,
    },
    include: {
      track: true,
    },
  });

  return setEntry;
}

/**
 * Remove track from playlist
 * Automatically shifts remaining tracks to fill the gap
 * Uses transaction with serializable isolation to prevent race conditions
 */
export async function removeTrackFromPlaylist(entryId: string) {
  return await prisma.$transaction(
    async (tx) => {
      // Get the entry to delete
      const entry = await tx.setEntry.findUnique({
        where: { id: entryId },
        select: { roomId: true, position: true },
      });

      if (!entry) {
        throw new Error('Set entry not found');
      }

      // Lock all entries in this room to prevent concurrent modifications
      await tx.$executeRaw`
        SELECT id FROM "SetEntry"
        WHERE "roomId" = ${entry.roomId}
        FOR UPDATE
      `;

      // Delete the entry
      const deletedEntry = await tx.setEntry.delete({
        where: { id: entryId },
        include: { track: true },
      });

      // Get all remaining tracks in the room ordered by position
      const remainingTracks = await tx.setEntry.findMany({
        where: { roomId: entry.roomId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });

      // Step 1: Move all tracks to temporary negative positions to avoid conflicts
      for (let i = 0; i < remainingTracks.length; i++) {
        await tx.setEntry.update({
          where: { id: remainingTracks[i].id },
          data: { position: -(i + 1000) }, // Use large negative numbers to avoid conflicts
        });
      }

      // Step 2: Update to final sequential positions
      for (let i = 0; i < remainingTracks.length; i++) {
        await tx.setEntry.update({
          where: { id: remainingTracks[i].id },
          data: { position: i },
        });
      }

      return deletedEntry;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/**
 * Update position of a track (reordering)
 * Handles shifting of other tracks automatically
 * Uses transaction with serializable isolation to prevent race conditions during concurrent reorders
 */
export async function updatePosition(entryId: string, newPosition: number) {
  // Wrap entire operation in transaction with serializable isolation level
  // This prevents concurrent modifications from interfering with each other
  return await prisma.$transaction(
    async (tx) => {
      const entry = await tx.setEntry.findUnique({
        where: { id: entryId },
        select: { roomId: true, position: true },
      });

      if (!entry) {
        throw new Error('Set entry not found');
      }

      const oldPosition = entry.position;

      if (oldPosition === newPosition) {
        // No change needed
        return await tx.setEntry.findUnique({
          where: { id: entryId },
          include: { track: true },
        });
      }

      // Lock all entries in this room to prevent concurrent reorders
      await tx.$executeRaw`
        SELECT id FROM "SetEntry"
        WHERE "roomId" = ${entry.roomId}
        FOR UPDATE
      `;

      // Get all entries in the room, ordered by position
      const allEntries = await tx.setEntry.findMany({
        where: { roomId: entry.roomId },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });

      // Calculate new positions for all entries
      const newPositions = new Map<string, number>();

      // Remove the entry being moved from its current position
      const entriesWithoutTarget = allEntries.filter(e => e.id !== entryId);

      // Insert it at the new position
      const finalOrder = [...entriesWithoutTarget];
      finalOrder.splice(newPosition, 0, { id: entryId, position: oldPosition });

      // Assign sequential positions
      finalOrder.forEach((e, index) => {
        newPositions.set(e.id, index);
      });

      // Phase 1: Move all entries to temporary negative positions
      for (let i = 0; i < allEntries.length; i++) {
        await tx.setEntry.update({
          where: { id: allEntries[i].id },
          data: { position: -(i + 1000) },
        });
      }

      // Phase 2: Move all entries to their final positions
      for (const [id, position] of newPositions.entries()) {
        await tx.setEntry.update({
          where: { id },
          data: { position },
        });
      }

      // Return the updated entry with track info
      const updatedEntry = await tx.setEntry.findUnique({
        where: { id: entryId },
        include: { track: true },
      });

      return updatedEntry;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

/**
 * Clear entire playlist for a room
 */
export async function clearPlaylist(roomId: string) {
  const result = await prisma.setEntry.deleteMany({
    where: {
      roomId,
    },
  });

  return result;
}
