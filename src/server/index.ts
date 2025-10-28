/**
 * Main server entry point
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import roomRoutes from './routes/rooms.js';
import { registerRoomHandlers } from './sockets/roomHandlers.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/rooms', roomRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log(`Client connected: ${socket.id}`);

  // Register room-related event handlers
  registerRoomHandlers(io, socket);
});

// Start server
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🎧 Listener server running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io, httpServer };
