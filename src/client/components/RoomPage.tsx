/**
 * RoomPage component - Displays a room with real-time user presence and playlist
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  joinRoom,
  onRoomState,
  onUserJoined,
  onUserLeft,
  onTrackAdded,
  onTrackRemoved,
  onTrackUpdated,
  onTrackReordered,
  RoomState,
  UserJoinedData,
  UserLeftData,
  TrackAddedData,
  TrackRemovedData,
  TrackUpdatedData,
  TrackReorderedData,
  disconnectSocket,
} from '../services/socket';
import { usePlaylistStore, type PlaylistTrack } from '../stores/playlistStore';
import { useDeckStore } from '../stores/deckStore';
import TrackList from './TrackList';
import AddTrackForm from './AddTrackForm';
import DeckPlayer from './DeckPlayer';
import Crossfader from './Crossfader';

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

  // Playlist store
  const setTracks = usePlaylistStore((state) => state.setTracks);
  const addTrack = usePlaylistStore((state) => state.addTrack);
  const removeTrack = usePlaylistStore((state) => state.removeTrack);
  const updateTrack = usePlaylistStore((state) => state.updateTrack);
  const reorderTrack = usePlaylistStore((state) => state.reorderTrack);
  const reset = usePlaylistStore((state) => state.reset);

  // Deck store for crossfader
  const crossfaderPosition = useDeckStore((state) => state.crossfaderPosition);
  const setCrossfaderPosition = useDeckStore((state) => state.setCrossfaderPosition);
  const resetDeck = useDeckStore((state) => state.reset);

  // Store load functions from deck components
  const [deckLoadFunctions, setDeckLoadFunctions] = useState<{
    A?: (track: PlaylistTrack) => void;
    B?: (track: PlaylistTrack) => void;
  }>({});

  // Stable callbacks for deck load function registration
  const onDeckALoadFunctionReady = useCallback((loadFn: (track: PlaylistTrack) => void) => {
    setDeckLoadFunctions((prev) => ({ ...prev, A: loadFn }));
  }, []);

  const onDeckBLoadFunctionReady = useCallback((loadFn: (track: PlaylistTrack) => void) => {
    setDeckLoadFunctions((prev) => ({ ...prev, B: loadFn }));
  }, []);

  // Handler for loading track to a specific deck
  const handleLoadToDeck = (deckId: 'A' | 'B', track: PlaylistTrack) => {
    const loadFn = deckLoadFunctions[deckId];
    if (loadFn) {
      loadFn(track);
    } else {
      console.error(`Load function for Deck ${deckId} not ready yet`);
    }
  };

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
      setTracks(data.tracks); // Initialize playlist store
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

    // Listen for track added
    const unsubscribeTrackAdded = onTrackAdded((data: TrackAddedData) => {
      addTrack(data.setEntry);
    });

    // Listen for track removed
    const unsubscribeTrackRemoved = onTrackRemoved((data: TrackRemovedData) => {
      removeTrack(data.entryId);
    });

    // Listen for track updated
    const unsubscribeTrackUpdated = onTrackUpdated((data: TrackUpdatedData) => {
      updateTrack(data.setEntry.id, data.setEntry);
    });

    // Listen for track reordered
    const unsubscribeTrackReordered = onTrackReordered((data: TrackReorderedData) => {
      // Use the full playlist from server for consistency (avoids client-side position calculation bugs)
      if (data.playlist) {
        setTracks(data.playlist);
      } else {
        // Fallback: use client-side reorder logic
        reorderTrack(data.entryId, data.newPosition);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribeState();
      unsubscribeJoined();
      unsubscribeLeft();
      unsubscribeTrackAdded();
      unsubscribeTrackRemoved();
      unsubscribeTrackUpdated();
      unsubscribeTrackReordered();
      disconnectSocket();
      reset(); // Clear playlist store
      resetDeck('A'); // Clear Deck A
      resetDeck('B'); // Clear Deck B
    };
  }, [roomId, setTracks, addTrack, removeTrack, updateTrack, reorderTrack, reset, resetDeck]);

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
    <div className="max-w-7xl mx-auto p-8 relative">
      {/* Logo - positioned absolutely to not take up space */}
      <img
        src="/listener-logo.png"
        alt="Listener"
        className="absolute top-1 right-8 h-40 w-auto opacity-60"
      />

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
        </div>
        <h1 className="text-3xl font-bold mb-2">{roomState.room.name}</h1>
        <p className="text-gray-400">
          Hosted by <span className="text-purple-400">{roomState.room.owner.name}</span>
        </p>
      </div>

      {/* Dual Deck Players - Stacked Vertically */}
      <div className="mb-4 space-y-2">
        <DeckPlayer deckId="A" onLoadFunctionReady={onDeckALoadFunctionReady} />

        {/* Crossfader - between decks */}
        <Crossfader position={crossfaderPosition} onChange={setCrossfaderPosition} />

        <DeckPlayer deckId="B" onLoadFunctionReady={onDeckBLoadFunctionReady} />
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
                  <div key={user.id} className="flex items-center p-3 bg-gray-700/50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.role}</p>
                    </div>
                    {user.id === roomState.room.owner.id && (
                      <span className="text-xs bg-purple-600 px-2 py-1 rounded">Owner</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Playlist Panel */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* Add Track Form */}
            <AddTrackForm roomId={roomId!} />

            {/* Track List */}
            <TrackList roomId={roomId!} onLoadToDeck={handleLoadToDeck} />
          </div>
        </div>
      </div>
    </div>
  );
}
