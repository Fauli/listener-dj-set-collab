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

export interface UpdateSetEntryData {
  note?: string;
  position?: number;
}

/**
 * Add track to room playlist at specific position
 * Handles position conflicts by shifting existing tracks
 */
export async function addTrackToPlaylist(data: AddTrackToPlaylistData) {
  // Shift existing tracks at or after this position
  await prisma.setEntry.updateMany({
    where: {
      roomId: data.roomId,
      position: {
        gte: data.position,
      },
    },
    data: {
      position: {
        increment: 1,
      },
    },
  });

  // Create new set entry
  const setEntry = await prisma.setEntry.create({
    data: {
      roomId: data.roomId,
      trackId: data.trackId,
      position: data.position,
      note: data.note,
    },
    include: {
      track: true,
    },
  });

  return setEntry;
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
    data,
    include: {
      track: true,
    },
  });

  return setEntry;
}

/**
 * Remove track from playlist
 * Automatically shifts remaining tracks to fill the gap
 */
export async function removeTrackFromPlaylist(entryId: string) {
  // Get the entry to delete
  const entry = await prisma.setEntry.findUnique({
    where: { id: entryId },
    select: { roomId: true, position: true },
  });

  if (!entry) {
    throw new Error('Set entry not found');
  }

  // Delete the entry
  const deletedEntry = await prisma.setEntry.delete({
    where: { id: entryId },
    include: { track: true },
  });

  // Shift remaining tracks down to fill the gap
  await prisma.setEntry.updateMany({
    where: {
      roomId: entry.roomId,
      position: {
        gt: entry.position,
      },
    },
    data: {
      position: {
        decrement: 1,
      },
    },
  });

  return deletedEntry;
}

/**
 * Update position of a track (reordering)
 * Handles shifting of other tracks automatically
 * Uses transaction to prevent race conditions during concurrent reorders
 */
export async function updatePosition(entryId: string, newPosition: number) {
  // Wrap entire operation in transaction for atomicity
  return await prisma.$transaction(async (tx) => {
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

    // Step 1: Move the entry to a temporary negative position to avoid conflicts
    await tx.setEntry.update({
      where: { id: entryId },
      data: { position: -1 },
    });

    // Step 2: Shift other tracks based on direction of movement
    if (oldPosition < newPosition) {
      // Moving down: shift tracks between old and new position down
      await tx.setEntry.updateMany({
        where: {
          roomId: entry.roomId,
          position: {
            gt: oldPosition,
            lte: newPosition,
          },
        },
        data: {
          position: {
            decrement: 1,
          },
        },
      });
    } else {
      // Moving up: shift tracks between new and old position up
      await tx.setEntry.updateMany({
        where: {
          roomId: entry.roomId,
          position: {
            gte: newPosition,
            lt: oldPosition,
          },
        },
        data: {
          position: {
            increment: 1,
          },
        },
      });
    }

    // Step 3: Move the entry to its final position
    const updatedEntry = await tx.setEntry.update({
      where: { id: entryId },
      data: { position: newPosition },
      include: { track: true },
    });

    return updatedEntry;
  });
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
