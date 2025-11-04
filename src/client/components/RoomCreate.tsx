/**
 * Room creation component
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createRoom, listRooms, deleteRoom as deleteRoomApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { RoomSkeleton } from './Skeleton';

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

export default function RoomCreate() {
  const { user } = useAuth();
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<{
    id: string;
    name: string;
    joinLink: string;
  } | null>(null);
  const [existingRooms, setExistingRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

  // Keyboard shortcut to close delete modal with Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteConfirm && !deleting) {
        setDeleteConfirm(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirm, deleting]);

  // Fetch user's existing rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;

      setLoadingRooms(true);
      try {
        const response = await listRooms(10); // Get last 10 rooms
        setExistingRooms(response.rooms);
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
        // Don't show error - it's not critical for room creation
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!user) {
      setError('You must be logged in to create a room');
      setLoading(false);
      return;
    }

    try {
      const response = await createRoom({
        name: roomName.trim(),
        ownerId: user.id,
      });

      // Construct correct frontend URL instead of using backend URL
      const frontendJoinLink = `${window.location.origin}/rooms/${response.room.id}`;

      setCreatedRoom({
        id: response.room.id,
        name: response.room.name,
        joinLink: frontendJoinLink,
      });
      setRoomName(''); // Reset form

      // Add new room to the existing rooms list
      setExistingRooms((prev) => [response.room, ...prev]);

      // Show success toast
      toast.success(`Room "${response.room.name}" created successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedRoom(null);
    setError('');
  };

  const handleCopyLink = async (roomId: string) => {
    const link = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedRoomId(roomId);
      toast.success('Room link copied to clipboard!');
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteConfirm) return;

    setDeleting(true);
    try {
      await deleteRoomApi(deleteConfirm.id);

      // Remove room from list
      setExistingRooms((prev) => prev.filter((room) => room.id !== deleteConfirm.id));
      toast.success(`Room "${deleteConfirm.name}" deleted successfully`);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete room. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Success state - show join link
  if (createdRoom) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-900/30 border border-green-600 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-green-400 mb-2">✓ Room Created!</h2>
          <p className="text-gray-300 mb-4">
            Room <span className="font-semibold">&quot;{createdRoom.name}&quot;</span> is ready
            for collaboration.
          </p>

          <div className="bg-gray-800 rounded p-4 mb-4">
            <label className="text-sm text-gray-400 block mb-2">Share this link:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={createdRoom.joinLink}
                readOnly
                className="flex-1 bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdRoom.joinLink);
                  toast.success('Room link copied to clipboard!');
                }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              to={`/rooms/${createdRoom.id}`}
              className="bg-primary-600 hover:bg-primary-700 px-6 py-2 rounded font-medium transition inline-block"
            >
              Join Room
            </Link>
            <button
              onClick={handleCreateAnother}
              className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded font-medium transition"
            >
              Create Another Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Create a New Room</h2>
        <p className="text-sm sm:text-base text-gray-400 mb-6">
          Start planning your DJ set with a collaborator in real-time.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="roomName" className="block text-sm font-medium mb-2">
              Room Name
            </label>
            <input
              type="text"
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Friday Night Mix"
              required
              minLength={1}
              maxLength={100}
              disabled={loading}
              className="w-full bg-gray-900 text-gray-200 px-4 py-3 rounded border border-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50"
            />
            <p className="text-sm text-gray-500 mt-1">
              Choose a descriptive name for your collaborative session
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-600 text-red-400 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !roomName.trim()}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded font-medium transition"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">What happens next?</h3>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• You&apos;ll get a shareable link to invite your collaborator</li>
            <li>• Both of you can add, reorder, and annotate tracks in real-time</li>
            <li>• All changes are saved automatically</li>
          </ul>
        </div>
      </div>

      {/* Existing Rooms Section */}
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mt-6" role="region" aria-label="Your existing rooms">
        <h3 className="text-lg sm:text-xl font-bold mb-4" id="existing-rooms-heading">Your Existing Rooms</h3>

        {loadingRooms ? (
          <div className="space-y-3">
            <RoomSkeleton />
            <RoomSkeleton />
            <RoomSkeleton />
          </div>
        ) : existingRooms.length > 0 ? (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Click on a room to continue where you left off
            </p>
            <div className="space-y-3" role="list" aria-labelledby="existing-rooms-heading">
              {existingRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-4"
                  role="listitem"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Room Info - Clickable */}
                    <Link
                      to={`/rooms/${room.id}`}
                      className="flex-1 group"
                      aria-label={`Open room ${room.name}`}
                    >
                      <h4 className="font-semibold text-gray-200 group-hover:text-primary-400 transition">
                        {room.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Created {new Date(room.createdAt).toLocaleDateString()}
                      </p>
                    </Link>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Copy Link Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopyLink(room.id);
                        }}
                        className="px-2 sm:px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs sm:text-sm font-medium transition flex items-center gap-1 sm:gap-2 touch-manipulation"
                        aria-label={`Copy link for ${room.name}`}
                        title="Copy room link"
                      >
                        {copiedRoomId === room.id ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="hidden sm:inline">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="hidden sm:inline">Copy Link</span>
                          </>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteConfirm({ id: room.id, name: room.name });
                        }}
                        className="px-2 sm:px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded text-xs sm:text-sm font-medium transition flex items-center gap-1 sm:gap-2 touch-manipulation"
                        aria-label={`Delete room ${room.name}`}
                        title="Delete room"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Empty state - no rooms yet
          <div className="text-center py-12">
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">No Rooms Yet</h4>
            <p className="text-gray-500 text-sm mb-4">
              Create your first room above to start collaborating with other DJs
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-2 text-red-400" id="delete-dialog-title">Delete Room?</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to delete <span className="font-semibold">&quot;{deleteConfirm.name}&quot;</span>?
            </p>
            <p className="text-gray-500 text-sm mb-6">
              This action cannot be undone. All tracks and playlist data in this room will be permanently deleted.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition disabled:opacity-50"
                aria-label="Cancel delete"
                title="Cancel (Esc)"
              >
                Cancel <span className="text-xs text-gray-400 hidden sm:inline">(Esc)</span>
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition disabled:opacity-50 flex items-center gap-2"
                aria-label={`Confirm delete room ${deleteConfirm.name}`}
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete Room'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
