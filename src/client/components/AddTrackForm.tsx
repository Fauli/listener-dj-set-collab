/**
 * AddTrackForm component - Upload tracks to the playlist
 */

import { useState, useEffect } from 'react';
import { addTrack } from '../services/socket';
import { usePlaylistStore } from '../stores/playlistStore';
import FileUpload, { UploadedFile } from './FileUpload';

interface AddTrackFormProps {
  roomId: string;
}

export default function AddTrackForm({ roomId }: AddTrackFormProps) {
  const tracks = usePlaylistStore((state) => state.tracks);
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Esc to close upload form
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }

      // Ctrl/Cmd+U to toggle upload form
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

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
          title="Upload tracks (Ctrl/Cmd+U)"
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
          Upload Tracks
          <span className="text-xs text-primary-200 ml-2 hidden sm:inline">
            (⌘U)
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Upload Tracks</h3>
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

      <FileUpload
        roomId={roomId}
        onFilesSelected={handleFilesSelected}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
