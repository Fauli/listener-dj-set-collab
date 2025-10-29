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
  bpm?: number | null;
  key?: string | null;
  energy?: number | null;
  sourceURI?: string | null;
}

export interface SetEntry {
  id: string;
  roomId: string;
  trackId: string;
  position: number;
  note?: string | null;
  createdAt: Date;
}

export interface PlaylistState {
  tracks: (SetEntry & { track: Track })[];
  users: User[];
}

// WebSocket Event Types

export interface RoomState {
  room: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string;
      role: string;
    };
  };
  users: Array<{
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
  tracks: Array<SetEntry & { track: Track }>;
}

export interface UserJoinedData {
  user: {
    id: string;
    name: string;
    role: string;
  };
  joinedAt: string;
}

export interface UserLeftData {
  users: Array<{
    id: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
}

export interface TrackAddedData {
  setEntry: SetEntry & { track: Track };
}

export interface TrackRemovedData {
  entryId: string;
  position: number;
}

export interface TrackUpdatedData {
  setEntry: SetEntry & { track: Track };
}

export interface TrackReorderedData {
  entryId: string;
  oldPosition: number;
  newPosition: number;
  playlist?: Array<SetEntry & { track: Track }>; // Server sends full updated playlist for consistency
}

// WebSocket Events
export type SocketEvent =
  | { type: 'room:join'; payload: { roomId: string; user: User } }
  | { type: 'playlist:add-track'; payload: { track: Track; position: number; note?: string } }
  | { type: 'playlist:reorder'; payload: { entryId: string; newPosition: number } }
  | { type: 'playlist:update-note'; payload: { entryId: string; note: string } }
  | { type: 'playlist:remove-track'; payload: { entryId: string } };

export type ServerEvent =
  | { type: 'playlist:state'; payload: PlaylistState }
  | { type: 'playlist:track-added'; payload: TrackAddedData }
  | { type: 'playlist:track-removed'; payload: TrackRemovedData }
  | { type: 'playlist:track-updated'; payload: TrackUpdatedData }
  | { type: 'playlist:track-reordered'; payload: TrackReorderedData }
  | { type: 'user:joined'; payload: UserJoinedData }
  | { type: 'user:left'; payload: UserLeftData }
  | { type: 'error'; payload: { message: string } };
