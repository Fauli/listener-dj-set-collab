/**
 * Room model service
 * Handles database operations for rooms
 */

import { prisma } from '../db/client.js';

export interface CreateRoomData {
  name: string;
  ownerId: string;
}

/**
 * Create a new room
 */
export async function createRoom(data: CreateRoomData) {
  const room = await prisma.room.create({
    data: {
      name: data.name,
      ownerId: data.ownerId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return room;
}

/**
 * Get room by ID
 */
export async function getRoomById(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      setEntries: {
        include: {
          track: true,
        },
        orderBy: {
          position: 'asc',
        },
      },
      sessions: {
        where: {
          leftAt: null, // Only active sessions
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });

  return room;
}

/**
 * Delete room by ID
 * Only the owner should be able to delete (enforced in route handler)
 */
export async function deleteRoom(roomId: string) {
  const room = await prisma.room.delete({
    where: { id: roomId },
  });

  return room;
}

/**
 * Get all rooms (for future admin/listing features)
 */
export async function getAllRooms(limit = 50) {
  const rooms = await prisma.room.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: {
          setEntries: true,
          sessions: true,
        },
      },
    },
  });

  return rooms;
}
