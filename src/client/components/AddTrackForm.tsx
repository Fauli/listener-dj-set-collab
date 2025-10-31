/**
 * AddTrackForm component - Form to add new tracks to the playlist
 */

import { useState } from 'react';
import { addTrack } from '../services/socket';
import { usePlaylistStore } from '../stores/playlistStore';
import FileUpload, { UploadedFile } from './FileUpload';

interface AddTrackFormProps {
  roomId: string;
}

export default function AddTrackForm({ roomId }: AddTrackFormProps) {
  const tracks = usePlaylistStore((state) => state.tracks);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    bpm: '',
    key: '',
    energy: '',
    note: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim() || !formData.artist.trim()) {
      alert('Title and Artist are required');
      return;
    }

    // Calculate next position (end of playlist)
    const nextPosition = tracks.length;

    // Emit track addition via WebSocket
    addTrack(
      roomId,
      {
        title: formData.title.trim(),
        artist: formData.artist.trim(),
        bpm: formData.bpm ? parseInt(formData.bpm, 10) : undefined,
        key: formData.key.trim() || undefined,
        energy: formData.energy ? parseInt(formData.energy, 10) : undefined,
      },
      nextPosition,
      formData.note.trim() || undefined
    );

    // Reset form
    setFormData({
      title: '',
      artist: '',
      bpm: '',
      key: '',
      energy: '',
      note: '',
    });

    // Collapse form
    setIsExpanded(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Queue system to ensure tracks are added in selection order
  const [uploadQueue] = useState<{
    queue: Array<{ order: number; fileId: string; file: UploadedFile | null }>;
    nextToEmit: number;
  }>({
    queue: [],
    nextToEmit: 0,
  });

  const handleFilesSelected = (files: UploadedFile[]) => {
    // Create queue entries for each file in selection order
    const baseOrder = uploadQueue.queue.length;

    files.forEach((uploadedFile, index) => {
      uploadQueue.queue.push({
        order: baseOrder + index,
        fileId: uploadedFile.id, // Store file ID for matching later
        file: null, // Will be set when upload completes
      });
    });
  };

  const processQueue = () => {
    // Process all completed files in order, emitting WebSocket events sequentially
    let emittedInThisCall = 0; // Track how many we've emitted in this call

    while (uploadQueue.nextToEmit < uploadQueue.queue.length) {
      const entry = uploadQueue.queue[uploadQueue.nextToEmit];

      // If this file hasn't completed yet, stop processing
      if (!entry.file || !entry.file.trackId || !entry.file.metadata) {
        break;
      }

      // Calculate position: current playlist length + files emitted so far in this call
      // This ensures each file gets a unique, sequential position even though
      // the WebSocket state updates are asynchronous
      const nextPosition = tracks.length + emittedInThisCall;

      // Emit WebSocket event to add track
      addTrack(
        roomId,
        {
          title: entry.file.metadata.title,
          artist: entry.file.metadata.artist,
          bpm: entry.file.metadata.bpm,
          key: entry.file.metadata.key,
          energy: undefined,
        },
        nextPosition,
        undefined,
        entry.file.trackId
      );

      // Move to next file in queue
      uploadQueue.nextToEmit++;
      emittedInThisCall++; // Increment for each emission
    }
  };

  const handleUploadComplete = (files: UploadedFile[]) => {
    // When a file upload completes, find it in the queue and mark it complete
    files.forEach((completedFile) => {
      if (completedFile.trackId && completedFile.metadata) {
        // Find this file in the queue by matching file ID
        const queueEntry = uploadQueue.queue.find(
          (entry) => entry.fileId === completedFile.id
        );

        if (queueEntry) {
          queueEntry.file = completedFile;
        }
      }
    });

    // Process the queue to emit events in order
    processQueue();
  };

  if (!isExpanded) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full bg-primary-600 hover:bg-primary-700 px-6 py-3 rounded font-medium transition flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Track to Playlist
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Add New Track</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-300 transition"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'upload'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'manual'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Manual Entry
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <FileUpload
          roomId={roomId}
          onFilesSelected={handleFilesSelected}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {activeTab === 'manual' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title and Artist - Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Track Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Solar"
                className="w-full bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="artist" className="block text-sm font-medium mb-2">
                Artist <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="artist"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                required
                placeholder="e.g., 012"
                className="w-full bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* BPM, Key, Energy - Optional */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="bpm" className="block text-sm font-medium mb-2">
                BPM
              </label>
              <input
                type="number"
                id="bpm"
                name="bpm"
                value={formData.bpm}
                onChange={handleChange}
                min="1"
                max="300"
                placeholder="e.g., 128"
                className="w-full bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="key" className="block text-sm font-medium mb-2">
                Key
              </label>
              <input
                type="text"
                id="key"
                name="key"
                value={formData.key}
                onChange={handleChange}
                maxLength={10}
                placeholder="e.g., Am"
                className="w-full bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 focus:border-primary-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="energy" className="block text-sm font-medium mb-2">
                Energy (1-10)
              </label>
              <input
                type="number"
                id="energy"
                name="energy"
                value={formData.energy}
                onChange={handleChange}
                min="1"
                max="10"
                placeholder="e.g., 7"
                className="w-full bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium mb-2">
              Note / Cue Point
            </label>
            <textarea
              id="note"
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={2}
              maxLength={500}
              placeholder="e.g., Mix on the drop, transition at 2:30"
              className="w-full bg-gray-900 text-gray-200 px-4 py-2 rounded border border-gray-700 focus:border-primary-500 focus:outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-primary-600 hover:bg-primary-700 px-6 py-3 rounded font-medium transition"
            >
              Add Track
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-6 py-3 rounded font-medium bg-gray-700 hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
