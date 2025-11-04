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
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRoomsRouter } from './routes/rooms.js';
import trackRoutes from './routes/tracks.js';
import uploadRoutes from './routes/uploads.js';
import authRoutes from './routes/auth.js';
import { registerRoomHandlers } from './sockets/roomHandlers.js';
import { registerPlaylistHandlers } from './sockets/playlistHandlers.js';
import { swaggerSpec } from './config/swagger.js';
import { configurePassport } from './config/passport.js';
import { apiLimiter, authLimiter, uploadLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger, { logInfo, logError } from './middleware/logger.js';
import { authenticateWebSocket } from './middleware/websocketAuth.js';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Trust first proxy (Nginx) - required for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for React in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"], // wss: for WebSocket, https: for API
      mediaSrc: ["'self'", "blob:"], // blob: for audio playback
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true, // Allow cookies for session management
}));
app.use(express.json({ limit: '10mb' })); // Set body size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax', // Use 'lax' to allow OAuth redirects from external providers
  },
});

app.use(sessionMiddleware);

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

// Authentication routes (with strict rate limiting)
app.use('/auth', authLimiter, authRoutes);

// API routes (with general rate limiting)
app.use('/api/rooms', apiLimiter, createRoomsRouter(io));
app.use('/api/rooms', apiLimiter, trackRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);

// Socket.io middleware - wrap Express session for Socket.io
io.engine.use(sessionMiddleware);

// Socket.io middleware - authenticate connections
io.use(authenticateWebSocket);

// Socket.io connection handling
io.on('connection', (socket) => {
  logInfo('Client connected', { socketId: socket.id });

  // Register event handlers
  registerRoomHandlers(io, socket);
  registerPlaylistHandlers(io, socket);

  socket.on('disconnect', () => {
    logInfo('Client disconnected', { socketId: socket.id });
  });
});

// Serve static files from the client build in production
if (process.env.NODE_ENV === 'production') {
  // Path to the built client files
  const clientBuildPath = path.join(__dirname, '../../client');

  logInfo('Serving static files', { path: clientBuildPath });

  // Serve static assets
  app.use(express.static(clientBuildPath));

  // Handle React Router - send all non-API requests to index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last middleware
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  logInfo('🎧 Listener server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    apiDocs: `http://localhost:${PORT}/api-docs`,
  });
});

export { app, io, httpServer };
