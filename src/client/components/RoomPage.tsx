/**
 * RoomPage component - Displays a room with real-time user presence
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  joinRoom,
  onRoomState,
  onUserJoined,
  onUserLeft,
  RoomState,
  UserJoinedData,
  UserLeftData,
  disconnectSocket,
} from '../services/socket';

// Temporary hardcoded user ID (DJ Alpha from seed data)
// TODO: Replace with actual auth when Phase 2 is implemented
const TEMP_USER_ID = 'f1aaa777-5fd9-4eac-88a5-02c46db731fa'; // DJ Alpha

interface User {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setError('No room ID provided');
      setLoading(false);
      return;
    }

    // Join the room
    joinRoom(roomId, TEMP_USER_ID);

    // Listen for initial room state
    const unsubscribeState = onRoomState((data: RoomState) => {
      setRoomState(data);
      setLoading(false);
      setError(null);
    });

    // Listen for users joining
    const unsubscribeJoined = onUserJoined((data: UserJoinedData) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: [
            ...prev.users,
            {
              id: data.user.id,
              name: data.user.name,
              role: data.user.role,
              joinedAt: data.joinedAt,
            },
          ],
        };
      });
    });

    // Listen for users leaving
    const unsubscribeLeft = onUserLeft((data: UserLeftData) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: data.users,
        };
      });
    });

    // Cleanup on unmount
    return () => {
      unsubscribeState();
      unsubscribeJoined();
      unsubscribeLeft();
      disconnectSocket();
    };
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Joining room...</p>
        </div>
      </div>
    );
  }

  if (error || !roomState) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-red-900/30 border border-red-600 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2 text-red-400">Error</h2>
          <p className="text-gray-300 mb-4">{error || 'Failed to load room'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white mb-4 transition-colors"
        >
          ← Back to Home
        </button>
        <h1 className="text-3xl font-bold mb-2">{roomState.room.name}</h1>
        <p className="text-gray-400">
          Hosted by <span className="text-purple-400">{roomState.room.owner.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Users Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Active Users
              <span className="ml-auto bg-purple-600 text-xs px-2 py-1 rounded-full">
                {roomState.users.length}
              </span>
            </h2>
            <div className="space-y-3">
              {roomState.users.length === 0 ? (
                <p className="text-gray-500 text-sm">No one here yet...</p>
              ) : (
                roomState.users.map((user: User) => (
                  <div
                    key={user.id}
                    className="flex items-center p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.role}</p>
                    </div>
                    {user.id === roomState.room.owner.id && (
                      <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                        Owner
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Playlist Panel */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🎵</span>
              Playlist
              <span className="ml-auto bg-purple-600 text-xs px-2 py-1 rounded-full">
                {roomState.tracks.length}
              </span>
            </h2>
            {roomState.tracks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">No tracks in the set yet</p>
                <p className="text-sm text-gray-600">
                  Track management coming in Phase 1.3
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {roomState.tracks.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-purple-600 rounded mr-4 font-bold">
                      {entry.position}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.track.title}</p>
                      <p className="text-sm text-gray-400">{entry.track.artist}</p>
                      {entry.note && (
                        <p className="text-xs text-gray-500 mt-1">Note: {entry.note}</p>
                      )}
                    </div>
                    {entry.track.bpm && (
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded mr-2">
                        {entry.track.bpm} BPM
                      </span>
                    )}
                    {entry.track.key && (
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                        {entry.track.key}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
