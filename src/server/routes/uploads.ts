/**
 * Upload routes for audio file handling
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import {
  extractMetadata,
  isSupportedAudioFormat,
  getAudioMimeType,
} from '../utils/metadataExtractor.js';
import { createTrack } from '../models/Track.js';
import { prisma } from '../db/client.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: UUID + original extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter to accept only audio files
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (isSupportedAudioFormat(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload MP3, WAV, FLAC, M4A, or AIFF files.'));
  }
};

// Configure multer with limits
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

/**
 * POST /api/upload
 * Upload audio file and extract metadata
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { roomId } = req.body;

    if (!roomId) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: 'Room not found' });
    }

    // Extract metadata from the audio file
    const metadata = await extractMetadata(req.file.path, req.file.originalname);

    // Create track record with extracted metadata and file reference
    const track = await createTrack({
      title: metadata.title,
      artist: metadata.artist,
      bpm: metadata.bpm,
      key: metadata.key,
      energy: undefined, // Energy is not auto-detected, user can add manually
      sourceURI: req.file.filename, // Store the filename for later retrieval
    });

    console.log(
      `File uploaded: ${req.file.originalname} → ${req.file.filename} (${metadata.extractedFrom} metadata)`
    );

    // Return track info and extracted metadata
    res.status(201).json({
      track,
      metadata: {
        ...metadata,
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
      },
    });
  } catch (error) {
    console.error('Error handling file upload:', error);

    // Clean up file if it was uploaded
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file after failed upload:', unlinkError);
      }
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${error.message}` });
    }

    res.status(500).json({
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/upload/:trackId/audio
 * Stream audio file for a specific track
 */
router.get('/:trackId/audio', async (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;

    // Get track from database
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, sourceURI: true, title: true },
    });

    if (!track || !track.sourceURI) {
      return res.status(404).json({ error: 'Track or audio file not found' });
    }

    const filePath = path.join('uploads', track.sourceURI);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Audio file not found on server' });
    }

    // Set appropriate headers for audio streaming
    const mimeType = getAudioMimeType(track.sourceURI);
    const stat = await fs.stat(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);
  } catch (error) {
    console.error('Error streaming audio file:', error);
    res.status(500).json({
      error: 'Failed to stream audio',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
