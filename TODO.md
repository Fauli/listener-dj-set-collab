# Listener Development TODO

This file tracks the implementation progress for the Listener MVP.

---

## 🚀 Phase 0: Initial Setup & Welcome Page ✅ COMPLETE

### Project Setup
- [x] Install npm dependencies (`npm install`)
- [x] Verify Node.js version (>= 18.0.0) - v23.7.0 ✓
- [x] Create local database (using SQLite for development)
- [x] Configure `.env` file with database URL
- [x] Generate Prisma client (`npm run db:generate`)
- [x] Run database migrations (`npm run db:migrate`)
- [x] Seed database with sample data (`npm run db:seed`)

### Get Welcome Page Running
- [x] Start backend server (`npm run dev:server`) - Running on :3000
- [x] Verify backend health endpoint (http://localhost:3000/health) ✓
- [x] Start frontend dev server (`npm run dev:client`) - Running on :5173
- [x] Verify frontend loads (http://localhost:5173) - Ready
- [ ] Verify React welcome page displays correctly - **TEST IN BROWSER**
- [ ] Test hot-reload on both frontend and backend
- [ ] Run initial tests (`npm test`)
- [ ] Fix any linting issues (`npm run lint`)

**Definition of Done:** Both servers run without errors, welcome page displays, hot-reload works.
**Status:** ✅ Servers running, database ready. **Next:** Open browser to verify UI.

---

## 📋 Phase 1: Core Room & Playlist Management

### Milestone 1.1: Room Creation
- [ ] Create Room model service (`src/server/models/Room.ts`)
  - [ ] `createRoom(name, ownerId)`
  - [ ] `getRoomById(id)`
  - [ ] `deleteRoom(id)`
- [ ] Implement REST endpoints (`src/server/routes/rooms.ts`)
  - [ ] `POST /api/rooms` - Create new room
  - [ ] `GET /api/rooms/:id` - Get room details
  - [ ] `DELETE /api/rooms/:id` - Delete room (owner only)
- [ ] Write unit tests for room service
- [ ] Write integration tests for room endpoints
- [ ] Add validation middleware (Zod schemas)
- [ ] Create frontend RoomCreate component
- [ ] Connect frontend to room creation API
- [ ] Display shareable room join link

**Definition of Done:** User can create a room and receive a join link.

---

### Milestone 1.2: Join Room Flow
- [ ] Implement WebSocket room join handler (`src/server/sockets/roomHandlers.ts`)
  - [ ] Handle `room:join` event
  - [ ] Add user to Socket.io room
  - [ ] Broadcast user presence to room
  - [ ] Send current room state to joining user
- [ ] Create Session model service
  - [ ] Track active user sessions
  - [ ] Handle reconnection logic
- [ ] Create frontend RoomPage component
  - [ ] Parse room ID from URL
  - [ ] Connect to WebSocket
  - [ ] Join room via socket event
  - [ ] Display room name and participants
- [ ] Create socket service on frontend (`src/client/services/socket.ts`)
- [ ] Add user presence indicators
- [ ] Write tests for room join flow (2 clients)

**Definition of Done:** Two users can join the same room and see each other online.

---

### Milestone 1.3: Track Management (CRUD)
- [ ] Create Track model service (`src/server/models/Track.ts`)
  - [ ] `createTrack(data)`
  - [ ] `getTrackById(id)`
  - [ ] `updateTrack(id, data)`
  - [ ] `deleteTrack(id)`
- [ ] Create SetEntry model service (`src/server/models/SetEntry.ts`)
  - [ ] `addTrackToPlaylist(roomId, trackId, position)`
  - [ ] `removeTrackFromPlaylist(entryId)`
  - [ ] `getPlaylistByRoom(roomId)`
  - [ ] `updatePosition(entryId, newPosition)`
- [ ] Implement track REST endpoints (`src/server/routes/tracks.ts`)
  - [ ] `POST /api/rooms/:roomId/tracks` - Add track to playlist
  - [ ] `GET /api/rooms/:roomId/tracks` - Get playlist
  - [ ] `DELETE /api/rooms/:roomId/tracks/:entryId` - Remove track
  - [ ] `PUT /api/rooms/:roomId/tracks/:entryId` - Update track metadata
- [ ] Add track validation schemas (Zod)
- [ ] Write unit tests for track services
- [ ] Write integration tests for track endpoints

**Definition of Done:** Tracks can be added, viewed, edited, and removed via API.

---

### Milestone 1.4: Real-Time Playlist Sync
- [ ] Implement WebSocket playlist handlers (`src/server/sockets/playlistHandlers.ts`)
  - [ ] Handle `playlist:add-track` event
  - [ ] Handle `playlist:remove-track` event
  - [ ] Handle `playlist:update-note` event
  - [ ] Broadcast changes to all room participants
- [ ] Create playlist state management (Zustand store)
  - [ ] `src/client/stores/playlistStore.ts`
  - [ ] Track list state
  - [ ] Optimistic updates
  - [ ] WebSocket event listeners
- [ ] Create TrackList component
  - [ ] Display tracks in order
  - [ ] Show track metadata (title, artist, BPM, key)
  - [ ] Show/edit notes per track
- [ ] Create AddTrackForm component
  - [ ] Form fields for track metadata
  - [ ] Client-side validation
  - [ ] Submit via WebSocket
- [ ] Test real-time sync with 2 clients
  - [ ] Add track in client 1 → appears in client 2
  - [ ] Remove track in client 2 → disappears in client 1
  - [ ] Edit note → syncs immediately

**Definition of Done:** Multiple users see live playlist updates within 500ms.

---

### Milestone 1.5: Drag & Drop Reordering
- [ ] Implement reorder logic in SetEntry service
  - [ ] `reorderTracks(roomId, fromPosition, toPosition)`
  - [ ] Handle position updates for affected tracks
- [ ] Add WebSocket handler for reordering
  - [ ] Handle `playlist:reorder` event
  - [ ] Broadcast new order to room
- [ ] Add drag & drop to TrackList component
  - [ ] Use `react-beautiful-dnd` or native HTML5 drag
  - [ ] Optimistic UI update
  - [ ] Emit reorder event on drop
- [ ] Write tests for reordering
  - [ ] Move track from position 0 → 2
  - [ ] Verify all positions update correctly
  - [ ] Test sync across clients

**Definition of Done:** Users can drag tracks to reorder, syncs live across clients.

---

## 📤 Phase 2: Export & Polish

### Milestone 2.1: CSV Export
- [ ] Implement export service (`src/server/services/exportService.ts`)
  - [ ] Generate CSV from playlist
  - [ ] Include all metadata (title, artist, BPM, key, notes)
  - [ ] Include position/order numbers
- [ ] Add export endpoint (`GET /api/rooms/:roomId/export`)
  - [ ] Return CSV file with correct headers
  - [ ] Set proper content-type and filename
- [ ] Create Export button component
  - [ ] Trigger download on click
  - [ ] Show loading state
- [ ] Write test for export
  - [ ] Verify CSV format
  - [ ] Verify all fields present

**Definition of Done:** User can click "Export" and download playlist as CSV.

---

### Milestone 2.2: UI/UX Polish
- [ ] Add loading states for all async operations
- [ ] Add error handling and user-friendly error messages
- [ ] Implement toast notifications for actions
- [ ] Add empty states (no tracks, no users)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Add keyboard shortcuts (delete track, etc.)
- [ ] Accessibility improvements (ARIA labels, focus management)
- [ ] Dark theme polish (current design)
- [ ] Add app logo/favicon

**Definition of Done:** App feels polished, no rough edges, accessible.

---

### Milestone 2.3: Simple Authentication
- [ ] Implement JWT token generation
- [ ] Create basic user registration (name only, no password for MVP)
- [ ] Add auth middleware for protected routes
- [ ] Store JWT in localStorage on client
- [ ] Add auth context/provider in React
- [ ] Protect room owner actions (delete room, etc.)
- [ ] Add "Join as Guest" option with generated name

**Definition of Done:** Users have identity, room owners have control.

---

## 🧪 Phase 3: Testing & Documentation

### Testing
- [ ] Achieve 70%+ unit test coverage
- [ ] Write integration tests for all API endpoints
- [ ] Write WebSocket event tests (2 client simulation)
- [ ] Add E2E test for critical user flows
  - [ ] Create room → Join room → Add track → Reorder → Export
- [ ] Set up CI/CD pipeline (GitHub Actions)
  - [ ] Run tests on PR
  - [ ] Run linting
  - [ ] Check build passes

### Documentation
- [ ] Add JSDoc comments to all public functions
- [ ] Create API documentation (endpoints, payloads)
- [ ] Add WebSocket event documentation
- [ ] Update README with deployment instructions
- [ ] Record demo video or GIF for README
- [ ] Write troubleshooting guide

**Definition of Done:** Code is well-tested and documented.

---

## 🚢 Phase 4: Deployment (Optional for MVP)

- [ ] Choose hosting platform (Render, Railway, Vercel)
- [ ] Set up production database (Neon, Supabase, etc.)
- [ ] Configure environment variables for production
- [ ] Build and deploy backend
- [ ] Build and deploy frontend
- [ ] Test production deployment
- [ ] Set up monitoring (error tracking, uptime)
- [ ] Add production .env.example

**Definition of Done:** App is live and accessible via public URL.

---

## 📊 Progress Tracker

**Current Phase:** Phase 0 - Initial Setup (Nearly Complete)
**Last Updated:** 2025-10-27 20:42 UTC
**Completed Milestones:** 0 / 11 (Phase 0 in progress)

### Phase Checklist
- [x] Phase 0: Initial Setup & Welcome Page (Servers running, awaiting browser verification)
- [ ] Phase 1.1: Room Creation
- [ ] Phase 1.2: Join Room Flow
- [ ] Phase 1.3: Track Management
- [ ] Phase 1.4: Real-Time Playlist Sync
- [ ] Phase 1.5: Drag & Drop Reordering
- [ ] Phase 2.1: CSV Export
- [ ] Phase 2.2: UI/UX Polish
- [ ] Phase 2.3: Simple Authentication
- [ ] Phase 3: Testing & Documentation
- [ ] Phase 4: Deployment (Optional)

---

## 🎯 Next Action

**Current Focus:** Phase 0 - Verify welcome page in browser

**Servers Running:**
- ✅ Backend: http://localhost:3000 (health check: OK)
- ✅ Frontend: http://localhost:5173
- ✅ Database: SQLite (seeded with sample data)

**Next Steps:**
1. Open http://localhost:5173 in your browser
2. Verify the welcome page displays correctly
3. Test hot-reload by editing `src/client/App.tsx`
4. Then move to Phase 1.1: Room Creation

---

## 📝 Notes

- Keep commits small and focused on one task
- Update this TODO.md after completing each checkbox
- Run tests before marking a milestone complete
- Refer to `docs/PLAN.md` for detailed feature specs
- Check `CLAUDE.md` for development principles
