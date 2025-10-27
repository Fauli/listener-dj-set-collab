# Listener - Collaborative Real-Time DJ Playlist Tool

## Project Overview

Listener is a collaborative real-time DJ playlist application built with Node.js and npm. It enables multiple users to create, manage, and interact with shared playlists in real-time, providing a synchronized music experience for DJs. The aim is to have a tool where DJs remotely can prepare the playlist for a nights DJ set.
There should be a history and change records on the playlist, as well as cue points and other required information so one can work on the set.

## Architecture

### Core Components

- **Backend Server**: Node.js/Express server handling API requests and WebSocket connections
- **Real-Time Layer**: WebSocket-based communication (Socket.io) for live playlist updates
- **Frontend Client**: Browser-based interface for playlist interaction
- **Music Integration**: Integration with music streaming services (Spotify, SoundCloud, etc.)
- **User Management**: Authentication and session handling
- **Playlist Engine**: Core logic for playlist management, voting, and queue ordering

### Tech Stack

- **Runtime**: Node.js (LTS version recommended)
- **Package Manager**: npm
- **Real-Time**: Socket.io or similar WebSocket library
- **Backend Framework**: Express.js
- **Database**: MongoDB/PostgreSQL for persistence (or in-memory for MVP)
- **Authentication**: JWT or session-based auth
- **Frontend**: React/Vue/Vanilla JS (TBD)

## Key Features

### Core Functionality

1. **Real-Time Playlist Management**
   - Add/remove tracks
   - Reorder songs
   - Live updates across all connected clients

2. **Collaborative Features**
   - Users can create new playlists for DJ sets and share share them with other DJs (read or edit)
   - Users can suggest tracks for playlists
   - Users can add cues and add transitions information

3. **Interation for music**
   - Tracks can be uploaded and played using two waveform editors
   - Tracks have BPM, Key (camelot key notation), and other relevant information
   - A Set can be played according to the CUE infos (track 2 start, track 1 end)

4. **User Roles**
   - DJ one (full control)
   - DJ two (see playlist)
   - DJ three (edit playlist)

## Development Guidelines

### Code Style

- Use ES6+ syntax with async/await for asynchronous operations
- Follow Standard.js or ESLint configuration for consistency
- Use meaningful variable and function names
- Comment complex business logic
- Keep functions small and focused (single responsibility)

### File Structure

```
listener/
├── src/
│   ├── server/          # Backend server code
│   │   ├── routes/      # API endpoints
│   │   ├── sockets/     # WebSocket handlers
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic
│   │   └── middleware/  # Express middleware
│   ├── client/          # Frontend code
│   │   ├── components/  # UI components
│   │   ├── services/    # API/socket clients
│   │   └── utils/       # Helper functions
│   └── shared/          # Shared types/constants
├── tests/               # Test files
├── config/              # Configuration files
└── scripts/             # Build/deploy scripts
```

### Real-Time Communication Patterns

When implementing Socket.io features:

```javascript
// Server-side event pattern
socket.on('playlist:add-track', async (data) => {
  // Validate data
  // Process request
  // Broadcast to room
  io.to(roomId).emit('playlist:track-added', track);
});

// Client-side listener pattern
socket.on('playlist:track-added', (track) => {
  // Update local state
  // Refresh UI
});
```

### Error Handling

- Use try-catch blocks for async operations
- Return meaningful error messages to clients
- Log errors server-side with context
- Implement graceful degradation for connection issues

### State Management

- Server is the source of truth for playlist state
- Clients maintain local cache for UI responsiveness
- Implement optimistic updates with rollback on error
- Handle reconnection scenarios gracefully

## API Design

### REST Endpoints

- `GET /api/playlists/:id` - Get playlist details
- `POST /api/playlists` - Create new playlist
- `PUT /api/playlists/:id/tracks` - Modify playlist
- `POST /api/playlists/:id/vote` - Vote on track
- `GET /api/rooms/:id` - Get room information

### WebSocket Events

**Client → Server**:
- `room:join` - Join a playlist room
- `playlist:add-track` - Add track to playlist
- `playlist:vote` - Vote on a track
- `playback:control` - Play/pause/skip

**Server → Client**:
- `playlist:updated` - Playlist state changed
- `user:joined` - User joined room
- `user:left` - User left room
- `playback:state` - Playback state changed

## Testing Strategy

### Unit Tests
- Test business logic in isolation
- Mock external dependencies (music APIs, database)
- Use Jest or Mocha + Chai

### Integration Tests
- Test API endpoints
- Test WebSocket event flows
- Test database operations

### E2E Tests
- Test user workflows
- Test multi-client synchronization
- Use Playwright or Cypress for frontend tests

## Environment Configuration

Required environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=mongodb://localhost:27017/listener
# or
DATABASE_URL=postgresql://user:pass@localhost:5432/listener

# Music APIs
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_secret
SOUNDCLOUD_API_KEY=your_key

# Authentication
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Performance Considerations

- Implement rate limiting on API endpoints and socket events
- Use Redis for session storage in production
- Optimize database queries with proper indexing
- Implement pagination for large playlists
- Use connection pooling for database connections
- Implement room-based socket namespaces to reduce broadcast overhead

## Security Best Practices

- Validate all user input (both REST and WebSocket)
- Implement authentication middleware
- Use HTTPS in production
- Sanitize data before database operations
- Implement CORS properly
- Rate limit socket events to prevent abuse
- Validate room permissions before allowing operations

## Deployment

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Use process manager (PM2, systemd)
- [ ] Enable compression middleware
- [ ] Configure reverse proxy (nginx)
- [ ] Set up SSL certificates
- [ ] Configure database connection pooling
- [ ] Set up logging (Winston, Pino)
- [ ] Configure monitoring (health checks)
- [ ] Implement graceful shutdown

### Scaling Considerations

- Use Redis adapter for Socket.io to enable horizontal scaling
- Implement sticky sessions for WebSocket connections
- Consider message queue (RabbitMQ, Redis) for heavy operations
- Use CDN for static assets

## Common Patterns

### Adding a New Feature

1. Define data models/types
2. Implement server-side logic
3. Create API endpoint or socket event handler
4. Add client-side service method
5. Update UI components
6. Write tests
7. Update documentation

### Debugging Real-Time Issues

- Use Socket.io debug mode: `DEBUG=socket.io* npm start`
- Log event emissions with room/user context
- Check network tab for WebSocket frames
- Verify room membership before broadcasts
- Test with multiple clients in different browsers

## Music API Integration

When integrating with music services:

- Cache API responses when possible
- Implement retry logic with exponential backoff
- Handle rate limiting gracefully
- Normalize track metadata across different services
- Store track URIs/IDs rather than full metadata

## Known Challenges

1. **Clock Synchronization**: Perfect playback sync across clients is hard; consider approximate sync with periodic adjustments
2. **Network Latency**: Implement optimistic UI updates with server confirmation
3. **Disconnection Handling**: Implement reconnection with state recovery
4. **Concurrent Modifications**: Use optimistic locking or last-write-wins strategy

## Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [WebSocket Best Practices](https://www.npmjs.com/package/ws#websocket-compression)

## AI Assistant Guidelines

When working on this project:

1. **Always consider real-time implications**: Changes to data structures affect both REST and WebSocket flows
2. **Maintain type consistency**: Ensure shared types between client and server
3. **Test multi-client scenarios**: Real-time bugs often only appear with multiple concurrent users
4. **Document socket events**: Keep event names and payloads documented
5. **Handle edge cases**: Disconnections, rapid updates, invalid data
6. **Security first**: Validate and authorize every operation
7. **Performance matters**: Consider the impact of broadcasts to large rooms

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

---

For questions or issues, refer to project documentation or open an issue in the repository.
