/**
 * API service for backend communication
 */

import { API_URL } from '../config/api.js';

const API_BASE = API_URL;

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
    throw new Error(error.error || 'Unable to create room. Please try again.');
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
    throw new Error(error.error || 'Unable to load room. The room may not exist or you may not have access.');
  }

  return response.json();
}

/**
 * List user's rooms (authenticated)
 */
export async function listRooms(limit?: number): Promise<{ rooms: Room[]; count: number }> {
  const url = limit ? `${API_BASE}/rooms?limit=${limit}` : `${API_BASE}/rooms`;
  const response = await fetch(url, {
    credentials: 'include', // Send session cookie
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Unable to load your rooms. Please try again.');
  }

  return response.json();
}

/**
 * Delete a room
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rooms/${roomId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Unable to delete room. You may not have permission or it may have already been deleted.');
  }
}
