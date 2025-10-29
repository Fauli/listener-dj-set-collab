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

interface AddTrackData {
  roomId: string;
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
 */
export async function handleAddTrack(io: Server, socket: Socket, data: AddTrackData) {
  try {
    const { roomId, track, position, note } = data;

    // Validate room exists
    const room = await getRoomById(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Validate track data
    const validatedTrack = createTrackSchema.parse(track);

    // Create track
    const createdTrack = await createTrack(validatedTrack);

    // Add to playlist
    const setEntry = await addTrackToPlaylist({
      roomId,
      trackId: createdTrack.id,
      position,
      note,
    });

    // Broadcast to all users in the room (including sender)
    io.to(roomId).emit('playlist:track-added', {
      setEntry,
    });

    // eslint-disable-next-line no-console
    console.log(`Track "${createdTrack.title}" added to room ${roomId} at position ${position}`);
  } catch (error) {
    console.error('Error in handleAddTrack:', error);

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
}

/**
 * Handle removing a track from the playlist
 */
export async function handleRemoveTrack(io: Server, socket: Socket, data: RemoveTrackData) {
  try {
    const { roomId, entryId } = data;

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

    // eslint-disable-next-line no-console
    console.log(`Track removed from room ${roomId} (entry: ${entryId})`);
  } catch (error) {
    console.error('Error in handleRemoveTrack:', error);
    socket.emit('error', {
      message: 'Failed to remove track',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
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

    // eslint-disable-next-line no-console
    console.log(`Track note updated in room ${roomId} (entry: ${entryId})`);
  } catch (error) {
    console.error('Error in handleUpdateNote:', error);
    socket.emit('error', {
      message: 'Failed to update track note',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle reordering a track in the playlist
 */
export async function handleReorder(io: Server, socket: Socket, data: ReorderTrackData) {
  try {
    const { roomId, entryId, newPosition } = data;

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

    // eslint-disable-next-line no-console
    console.log(`Track reordered in room ${roomId}: ${oldPosition} → ${newPosition}`);
  } catch (error) {
    console.error('Error in handleReorder:', error);
    socket.emit('error', {
      message: 'Failed to reorder track',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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
