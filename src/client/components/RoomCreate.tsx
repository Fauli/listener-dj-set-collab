/**
 * Room creation component
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createRoom } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedRoom(null);
    setError('');
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
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Create a New Room</h2>
        <p className="text-gray-400 mb-6">
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
    </div>
  );
}
