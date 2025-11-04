/**
 * RoomPage component - Displays a room with real-time user presence and playlist
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    if (!roomId || !user) {
      if (!user) {
        setError('Please log in to access this room.');
      } else {
        setError('Invalid room link. Please check the URL and try again.');
      }
      setLoading(false);
      return;
    }

    // Join the room
    joinRoom(roomId, user.id);

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
      toast.success(`Track "${data.setEntry.track.title}" added to playlist`);
    });

    // Listen for track removed
    const unsubscribeTrackRemoved = onTrackRemoved((data: TrackRemovedData) => {
      console.log('🗑️  Received playlist:track-removed event:', data);
      removeTrack(data.entryId);
      console.log('✅ Called removeTrack for entryId:', data.entryId);
      toast.success('Track removed from playlist');
    });

    // Listen for track updated
    const unsubscribeTrackUpdated = onTrackUpdated((data: TrackUpdatedData) => {
      updateTrack(data.setEntry.id, data.setEntry);
      // Don't show toast for track updates - they happen frequently and would be noisy
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
  }, [roomId, user, setTracks, addTrack, removeTrack, updateTrack, reorderTrack, reset, resetDeck]);

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
          <h2 className="text-xl font-bold mb-2 text-red-400">Unable to Load Room</h2>
          <p className="text-gray-300 mb-4">
            {error || 'This room could not be loaded. It may have been deleted or you may not have permission to access it.'}
          </p>
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative">
      {/* Logo - positioned absolutely to not take up space, hidden on mobile */}
      <img
        src="/listener-logo.png"
        alt="Listener"
        className="hidden lg:block absolute top-10 right-8 h-24 w-auto opacity-60"
      />

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            ← Back to Home
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{roomState.room.name}</h1>
        <p className="text-sm sm:text-base text-gray-400">
          Hosted by <span className="text-purple-400">{roomState.room.owner.name}</span>
        </p>
      </div>

      {/* Dual Deck Players - Stacked Vertically */}
      <div className="mb-4 sm:mb-6 space-y-2">
        <DeckPlayer deckId="A" onLoadFunctionReady={onDeckALoadFunctionReady} />

        {/* Crossfader - between decks */}
        <Crossfader position={crossfaderPosition} onChange={setCrossfaderPosition} />

        <DeckPlayer deckId="B" onLoadFunctionReady={onDeckBLoadFunctionReady} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Active Users Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700" role="region" aria-label="Active users">
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center" id="active-users-heading">
              <span className="mr-2" aria-hidden="true">👥</span>
              Active Users
              <span className="ml-auto bg-purple-600 text-xs px-2 py-1 rounded-full" aria-label={`${roomState.users.length} active users`}>
                {roomState.users.length}
              </span>
            </h2>
            <div className="space-y-3">
              {roomState.users.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-16 h-16 text-gray-600 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <h4 className="text-base font-semibold text-gray-300 mb-2">
                    Waiting for Collaborators
                  </h4>
                  <p className="text-gray-500 text-sm mb-3">
                    Share the room link to invite other DJs
                  </p>
                  <button
                    onClick={() => {
                      const link = window.location.href;
                      navigator.clipboard.writeText(link);
                      toast.success('Room link copied to clipboard!');
                    }}
                    className="text-primary-400 hover:text-primary-300 text-sm font-medium transition inline-flex items-center gap-1"
                    aria-label="Copy room link to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Room Link
                  </button>
                </div>
              ) : (
                <div role="list" aria-labelledby="active-users-heading">
                  {roomState.users.map((user: User) => (
                    <div key={user.id} className="flex items-center p-3 bg-gray-700/50 rounded-lg" role="listitem">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse" aria-label="Online"></div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.role}</p>
                      </div>
                      {user.id === roomState.room.owner.id && (
                        <span className="text-xs bg-purple-600 px-2 py-1 rounded" aria-label="Room owner">Owner</span>
                      )}
                    </div>
                  ))}
                </div>
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

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp />
    </div>
  );
}
