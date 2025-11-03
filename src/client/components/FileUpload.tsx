/**
 * FileUpload component - Drag-and-drop file uploader for audio files
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { API_URL } from '../config/api.js';

export interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  metadata?: {
    title: string;
    artist: string;
    bpm?: number;
    key?: string;
    extractedFrom: 'id3' | 'filename';
  };
  trackId?: string;
}

interface FileUploadProps {
  roomId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onFilesSelected?: (files: UploadedFile[]) => void;
}

export default function FileUpload({ roomId, onUploadComplete, onFilesSelected }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['.mp3', '.wav', '.flac', '.m4a', '.aiff', '.aif'];
  const maxFileSize = 100 * 1024 * 1024; // 100MB

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!supportedFormats.includes(ext)) {
      return `Unsupported format. Please upload ${supportedFormats.join(', ')} files.`;
    }
    if (file.size > maxFileSize) {
      return `File too large. Maximum size is 100MB.`;
    }
    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validateFile(file);

      newFiles.push({
        file,
        id: generateFileId(),
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error ?? undefined,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);

    if (onFilesSelected) {
      onFilesSelected(newFiles);
    }

    // Auto-upload valid files
    newFiles.forEach((uploadedFile) => {
      if (!uploadedFile.error) {
        uploadFile(uploadedFile);
      }
    });
  };

  const uploadFile = async (uploadedFile: UploadedFile) => {
    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f))
    );

    const formData = new FormData();
    formData.append('file', uploadedFile.file);
    formData.append('roomId', roomId);

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f))
          );
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);

          // Create the completed file object with metadata
          const completedFile: UploadedFile = {
            ...uploadedFile,
            status: 'completed',
            progress: 100,
            metadata: response.metadata,
            trackId: response.track.id,
          };

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? completedFile : f
            )
          );

          // Notify parent with the completed file immediately
          if (onUploadComplete) {
            onUploadComplete([completedFile]);
          }
        } else {
          const errorData = JSON.parse(xhr.responseText);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id
                ? {
                    ...f,
                    status: 'error' as const,
                    error: errorData.error || 'Upload failed',
                  }
                : f
            )
          );
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error' as const, error: 'Network error' }
              : f
          )
        );
      });

      xhr.open('POST', `${API_URL}/upload`);
      xhr.send(formData);
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadedFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${
            isDragging
              ? 'border-primary-500 bg-primary-900/20'
              : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }
        `}
        onClick={handleBrowseClick}
      >
        <div className="flex flex-col items-center gap-3">
          <svg
            className={`w-12 h-12 ${isDragging ? 'text-primary-500' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div>
            <p className="text-lg font-medium">
              {isDragging ? 'Drop files here' : 'Drag and drop audio files'}
            </p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            <p className="text-xs text-gray-500 mt-2">
              Supports: MP3, WAV, FLAC, M4A, AIFF (max 100MB per file)
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={supportedFormats.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">Uploads</h3>
          {files.map((uploadedFile) => (
            <div
              key={uploadedFile.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {uploadedFile.status === 'completed' && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {uploadedFile.status === 'error' && (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {uploadedFile.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{uploadedFile.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>

                  {/* Metadata Preview */}
                  {uploadedFile.metadata && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-300">
                        <span className="font-medium">{uploadedFile.metadata.title}</span> by{' '}
                        <span className="font-medium">{uploadedFile.metadata.artist}</span>
                      </p>
                      {uploadedFile.metadata.extractedFrom === 'filename' && (
                        <p className="text-xs text-yellow-500 mt-1">
                          ⚠ Metadata extracted from filename (no ID3 tags found)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Progress Bar */}
                  {uploadedFile.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{uploadedFile.progress}%</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadedFile.error && (
                    <p className="text-sm text-red-400 mt-2">{uploadedFile.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(uploadedFile.id);
                  }}
                  className="flex-shrink-0 text-gray-400 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
