/**
 * API service for backend communication
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

interface CreateRoomRequest {
  name: string;
  ownerId: string;
}

interface Room {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    role: string;
  };
}

interface CreateRoomResponse {
  room: Room;
  joinLink: string;
}

/**
 * Create a new room
 */
export async function createRoom(data: CreateRoomRequest): Promise<CreateRoomResponse> {
  const response = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }

  return response.json();
}

/**
 * Get room by ID
 */
export async function getRoom(roomId: string): Promise<{ room: Room }> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch room');
  }

  return response.json();
}

/**
 * List all rooms
 */
export async function listRooms(limit?: number): Promise<{ rooms: Room[]; count: number }> {
  const url = limit ? `${API_BASE}/rooms?limit=${limit}` : `${API_BASE}/rooms`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch rooms');
  }

  return response.json();
}
