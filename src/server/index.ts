/**
 * Main server entry point
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { createRoomsRouter } from './routes/rooms.js';
import trackRoutes from './routes/tracks.js';
import uploadRoutes from './routes/uploads.js';
import authRoutes from './routes/auth.js';
import { registerRoomHandlers } from './sockets/roomHandlers.js';
import { registerPlaylistHandlers } from './sockets/playlistHandlers.js';
import { swaggerSpec } from './config/swagger.js';
import { configurePassport } from './config/passport.js';

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
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true, // Allow cookies for session management
}));
app.use(express.json());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  })
);

// Initialize Passport and configure strategies
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns server health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation with Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Listener API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// Authentication routes
app.use('/auth', authRoutes);

// API routes
app.use('/api/rooms', createRoomsRouter(io));
app.use('/api/rooms', trackRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  // eslint-disable-next-line no-console
  console.log(`Client connected: ${socket.id}`);

  // Register event handlers
  registerRoomHandlers(io, socket);
  registerPlaylistHandlers(io, socket);
});

// Start server
httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🎧 Listener server running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  // eslint-disable-next-line no-console
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io, httpServer };
