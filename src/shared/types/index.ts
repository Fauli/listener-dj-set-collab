/**
 * Shared types between client and server
 */

export interface User {
  id: string;
  name: string;
  role: 'dj1' | 'dj2' | 'listener';
}

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  ownerId: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm?: number;
  key?: string;
  energy?: number;
  sourceURI?: string;
}

export interface SetEntry {
  id: string;
  roomId: string;
  trackId: string;
  position: number;
  note?: string;
  createdAt: Date;
}

export interface PlaylistState {
  tracks: (SetEntry & { track: Track })[];
  users: User[];
}

// WebSocket Events
export type SocketEvent =
  | { type: 'room:join'; payload: { roomId: string; user: User } }
  | { type: 'playlist:add-track'; payload: { track: Track } }
  | { type: 'playlist:reorder'; payload: { from: number; to: number } }
  | { type: 'playlist:update-note'; payload: { trackId: string; note: string } }
  | { type: 'playlist:remove-track'; payload: { trackId: string } };

export type ServerEvent =
  | { type: 'playlist:state'; payload: PlaylistState }
  | { type: 'playlist:track-added'; payload: { track: Track } }
  | { type: 'playlist:updated'; payload: Partial<PlaylistState> }
  | { type: 'user:joined'; payload: { user: User } }
  | { type: 'user:left'; payload: { userId: string } }
  | { type: 'error'; payload: { message: string } };
