/**
 * Shared constants between client and server
 */

export const SOCKET_EVENTS = {
  // Client → Server
  ROOM_JOIN: 'room:join',
  PLAYLIST_ADD_TRACK: 'playlist:add-track',
  PLAYLIST_REORDER: 'playlist:reorder',
  PLAYLIST_UPDATE_NOTE: 'playlist:update-note',
  PLAYLIST_REMOVE_TRACK: 'playlist:remove-track',

  // Server → Client
  PLAYLIST_STATE: 'playlist:state',
  PLAYLIST_TRACK_ADDED: 'playlist:track-added',
  PLAYLIST_UPDATED: 'playlist:updated',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  ERROR: 'error',
} as const;

export const DEFAULT_PORT = 3000;
export const DEFAULT_CLIENT_PORT = 5173;

export const USER_ROLES = {
  DJ1: 'dj1',
  DJ2: 'dj2',
  LISTENER: 'listener',
} as const;
