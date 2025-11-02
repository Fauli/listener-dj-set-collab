/**
 * Track model service
 * Handles CRUD operations for tracks
 */

import { prisma } from '../db/client.js';

export interface CreateTrackData {
  title: string;
  artist: string;
  bpm?: number;
  key?: string;
  energy?: number;
  duration?: number;
  sourceURI?: string;
}

export interface UpdateTrackData {
  title?: string;
  artist?: string;
  bpm?: number | null;
  key?: string | null;
  energy?: number | null;
  duration?: number | null;
  sourceURI?: string | null;
}

/**
 * Create a new track
 */
export async function createTrack(data: CreateTrackData) {
  const track = await prisma.track.create({
    data: {
      title: data.title,
      artist: data.artist,
      bpm: data.bpm,
      key: data.key,
      energy: data.energy,
      duration: data.duration,
      sourceURI: data.sourceURI,
    },
  });

  return track;
}

/**
 * Get track by ID
 */
export async function getTrackById(trackId: string) {
  const track = await prisma.track.findUnique({
    where: {
      id: trackId,
    },
  });

  return track;
}

/**
 * Update track metadata
 */
export async function updateTrack(trackId: string, data: UpdateTrackData) {
  const track = await prisma.track.update({
    where: {
      id: trackId,
    },
    data,
  });

  return track;
}

/**
 * Delete track
 * Note: Will fail if track is in any playlists (SetEntry references it)
 */
export async function deleteTrack(trackId: string) {
  const track = await prisma.track.delete({
    where: {
      id: trackId,
    },
  });

  return track;
}

/**
 * Search tracks by title or artist
 */
export async function searchTracks(query: string, limit = 50) {
  const tracks = await prisma.track.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { artist: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return tracks;
}

/**
 * Get all tracks with pagination
 */
export async function getAllTracks(limit = 50, offset = 0) {
  const tracks = await prisma.track.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  return tracks;
}
