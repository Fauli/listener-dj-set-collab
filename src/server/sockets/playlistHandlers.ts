/**
 * WebSocket handlers for playlist operations
 */

import { Server, Socket } from 'socket.io';
import { createTrack } from '../models/Track.js';
import {
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  updateSetEntry,
  updatePosition,
  getPlaylistByRoom,
} from '../models/SetEntry.js';
import { getRoomById } from '../models/Room.js';
import { createTrackSchema } from '../validators/trackSchemas.js';
import { ZodError } from 'zod';
import { logInfo, logError } from '../middleware/logger.js';

/**
 * Operation queue to ensure sequential processing per room
 * Prevents race conditions when multiple tracks are added concurrently
 */
class RoomOperationQueue {
  private queues = new Map<string, Promise<unknown>>();

  /**
   * Execute an operation sequentially for a given room
   */
  async executeForRoom<T>(roomId: string, operation: () => Promise<T>): Promise<T> {
    // Get or create the promise chain for this room
    const existingChain = this.queues.get(roomId) || Promise.resolve();

    // Chain the new operation after existing ones
    const newChain = existingChain
      .then(() => operation())
      .catch((error) => {
        // Log error but don't break the chain
        logError(`Operation failed for room ${roomId}`, error);
        throw error;
      });

    // Store the promise (without the result)
    this.queues.set(roomId, newChain.catch(() => {}));

    // Return the result of this specific operation
    return newChain;
  }
}

const operationQueue = new RoomOperationQueue();

interface AddTrackData {
  roomId: string;
  trackId?: string; // Optional: if provided, use existing track instead of creating new one
  track: {
    title: string;
    artist: string;
    bpm?: number;
    key?: string;
    energy?: number;
    sourceURI?: string;
  };
  position: number;
  note?: string;
}

interface RemoveTrackData {
  roomId: string;
  entryId: string;
}

interface UpdateNoteData {
  roomId: string;
  entryId: string;
  note: string;
}

interface ReorderTrackData {
  roomId: string;
  entryId: string;
  newPosition: number;
}

/**
 * Handle adding a track to the playlist
 * Uses operation queue to ensure tracks are added sequentially per room
 */
export async function handleAddTrack(io: Server, socket: Socket, data: AddTrackData) {
  const { roomId } = data;

  // Queue this operation for the room to prevent concurrent inserts
  return operationQueue.executeForRoom(roomId, async () => {
    try {
      const { trackId, track, position, note } = data;

      // Validate room exists
      const room = await getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      let finalTrackId: string;
      let trackTitle: string;

      // If trackId is provided, use existing track (from upload)
      // Otherwise, create a new track (for manual entry)
      if (trackId) {
        finalTrackId = trackId;
        trackTitle = track.title;
      } else {
        // Validate track data
        const validatedTrack = createTrackSchema.parse(track);

        // Create new track
        const createdTrack = await createTrack(validatedTrack);
        finalTrackId = createdTrack.id;
        trackTitle = createdTrack.title;
      }

      // Add to playlist
      const setEntry = await addTrackToPlaylist({
        roomId,
        trackId: finalTrackId,
        position,
        note,
      });

      // Broadcast to all users in the room (including sender)
      io.to(roomId).emit('playlist:track-added', {
        setEntry,
      });

      logInfo('Track added to room', {
        trackTitle,
        roomId,
        position,
        trackId: finalTrackId,
      });
    } catch (error) {
      logError('Error in handleAddTrack', error);

      if (error instanceof ZodError) {
        socket.emit('error', {
          message: 'Invalid track data',
          details: error.issues.map((i) => i.message).join(', '),
        });
      } else {
        socket.emit('error', {
          message: 'Failed to add track',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });
}

/**
 * Handle removing a track from the playlist
 * Made idempotent - if track is already deleted, still broadcast for sync
 */
export async function handleRemoveTrack(io: Server, socket: Socket, data: RemoveTrackData) {
  const { roomId, entryId } = data;

  try {
    // Validate room exists
    const room = await getRoomById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Remove track (this also returns the position before deletion)
    const removedEntry = await removeTrackFromPlaylist(entryId);

    // Broadcast to all users in the room
    io.to(roomId).emit('playlist:track-removed', {
      entryId,
      position: removedEntry.position,
    });

    logInfo('Track removed from room', {
      roomId,
      entryId,
      position: removedEntry.position,
    });
  } catch (error) {
    logError('Error in handleRemoveTrack', error);

    // If track not found (already deleted), treat as success and broadcast anyway
    // This makes delete idempotent and ensures all clients stay in sync
    if (error instanceof Error && error.message === 'Set entry not found') {
      // Still broadcast removal to keep clients in sync
      io.to(roomId).emit('playlist:track-removed', {
        entryId,
        position: -1, // Position unknown since already deleted
      });
      logInfo('Track already deleted, broadcasting for sync', {
        entryId,
        roomId,
      });
    } else {
      // Other errors: emit to requesting client only
      socket.emit('error', {
        message: 'Failed to remove track',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Handle updating a track's note
 */
export async function handleUpdateNote(io: Server, socket: Socket, data: UpdateNoteData) {
  try {
    const { roomId, entryId, note } = data;

    // Validate room exists
    const room = await getRoomById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Update note
    const updatedEntry = await updateSetEntry(entryId, { note });

    // Broadcast to all users in the room
    io.to(roomId).emit('playlist:track-updated', {
      setEntry: updatedEntry,
    });

    logInfo('Track note updated', {
      roomId,
      entryId,
    });
  } catch (error) {
    logError('Error in handleUpdateNote', error);
    socket.emit('error', {
      message: 'Failed to update track note',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle reordering a track in the playlist
 * Uses operation queue to ensure sequential processing per room
 */
export async function handleReorder(io: Server, socket: Socket, data: ReorderTrackData) {
  const { roomId } = data;

  // Queue this operation for the room to prevent concurrent reorders
  return operationQueue.executeForRoom(roomId, async () => {
    try {
      const { entryId, newPosition } = data;

      // Validate room exists
      const room = await getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Get old position before update
      const playlist = await getPlaylistByRoom(roomId);
      const entry = playlist.find((e) => e.id === entryId);
      const oldPosition = entry?.position ?? -1;

      // Reorder track (uses transaction internally)
      await updatePosition(entryId, newPosition);

      // Broadcast new playlist order to all users
      // We send the entire updated playlist to ensure consistency
      const updatedPlaylist = await getPlaylistByRoom(roomId);

      io.to(roomId).emit('playlist:track-reordered', {
        entryId,
        oldPosition,
        newPosition,
        playlist: updatedPlaylist,
      });

      logInfo('Track reordered', {
        roomId,
        entryId,
        oldPosition,
        newPosition,
      });
    } catch (error) {
      logError('Error in handleReorder', error);
      socket.emit('error', {
        message: 'Failed to reorder track',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

/**
 * Register all playlist-related socket handlers
 */
export function registerPlaylistHandlers(io: Server, socket: Socket) {
  socket.on('playlist:add-track', (data: AddTrackData) => handleAddTrack(io, socket, data));
  socket.on('playlist:remove-track', (data: RemoveTrackData) => handleRemoveTrack(io, socket, data));
  socket.on('playlist:update-note', (data: UpdateNoteData) => handleUpdateNote(io, socket, data));
  socket.on('playlist:reorder', (data: ReorderTrackData) => handleReorder(io, socket, data));
}
