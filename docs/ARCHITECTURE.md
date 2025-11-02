# Listener - Technical Architecture

> **When to read this:** You need to understand the tech stack, folder structure, database schema, or deployment configuration.

## Tech Stack

| Layer        | Technology                        | Purpose                    |
| ------------ | --------------------------------- | -------------------------- |
| **Backend**  | Node.js + Express                 | REST + WebSocket endpoints |
| **Realtime** | Socket.io                         | Live playlist sync         |
| **Frontend** | React (Vite)                      | Realtime UI + drag & drop  |
| **Database** | PostgreSQL 17                     | Tracks / Playlists / Users |
| **ORM**      | Prisma                            | Type-safe database access  |
| **Auth**     | JWT (basic)                       | User authentication        |
| **Testing**  | Vitest (unit) + Playwright (E2E)  | Automated testing          |
| **Audio**    | Howler.js + WaveSurfer.js         | Playback + visualization   |

## Folder Structure

```
listener/
├── src/
│   ├── server/
│   │   ├── routes/       # REST endpoints
│   │   ├── sockets/      # WebSocket handlers
│   │   ├── models/       # Database models (Prisma)
│   │   ├── services/     # Business logic
│   │   ├── validators/   # Zod schemas
│   │   ├── utils/        # Helpers (metadata extraction, etc.)
│   │   ├── db/           # Database client + seed scripts
│   │   ├── config/       # Swagger, environment
│   │   └── index.ts      # Server entry point
│   ├── client/
│   │   ├── components/   # React components
│   │   ├── services/     # API + socket clients
│   │   ├── stores/       # Zustand state management
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Helpers (Camelot key, beat grid, etc.)
│   │   └── main.tsx      # Client entry point
│   └── shared/           # Shared types / constants (TypeScript)
├── tests/                # Unit & E2E tests
│   ├── integration/      # API integration tests
│   └── e2e/              # Playwright E2E tests
├── uploads/              # Audio file storage (local, .gitignored)
├── prisma/               # Database schema + migrations
├── docs/                 # Documentation
│   ├── PLAN.md           # Feature specs + milestones
│   └── ARCHITECTURE.md   # This file
├── .claude/              # Claude Code configuration
│   ├── commands/         # Custom slash commands
│   └── hooks/            # Pre-commit hooks
└── config/               # Environment & deployment
```

## Database Schema

**Core entities:**
- `Room` - DJ session container
- `Track` - Audio file metadata
- `SetEntry` - Track positioned in room playlist (join table)
- `Session` - Active user connections (WebSocket state)

**Key relationships:**
- Room → many SetEntry (playlist)
- Track → many SetEntry (reusable across rooms)
- Room → many Session (active DJs)

**Special fields:**
- `SetEntry.cuePoints` - JSON storing Start/End/A/B cue points
- `SetEntry.position` - Integer for drag & drop ordering
- `Track.sourceURI` - Filename in `uploads/` directory

## Socket.io Event Patterns

**Naming convention:**
- `playlist:*` → track operations (add, remove, update, reorder)
- `room:*` → user/session operations (join, leave, presence)

**Example flow:**
```typescript
// Server
socket.on('playlist:add-track', async (data) => {
  const track = await addTrack(data);
  io.to(roomId).emit('playlist:track-added', track);
});

// Client
socket.on('playlist:track-added', (track) => updateLocalPlaylist(track));
```

## API Structure

**REST endpoints:**
- `/api/rooms` - Room CRUD
- `/api/rooms/:roomId/tracks` - Playlist management
- `/api/upload` - File upload + metadata extraction
- `/api/upload/:trackId/audio` - Audio streaming

**WebSocket events:**
- Room joining/leaving
- Playlist sync (add, remove, update, reorder)
- Real-time presence updates

## Environment Variables

```bash
# Server
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/listener
JWT_SECRET=changeme
ALLOWED_ORIGINS=http://localhost:5173

# Frontend (Vite)
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

## Audio Processing

**Metadata extraction:**
- Library: `music-metadata` (ID3 tag parsing)
- Fallback: Filename parsing for missing tags
- BPM extraction: Comment field regex
- Key extraction: Comment field (Camelot notation)

**Playback:**
- Howler.js for audio decoding + playback
- WaveSurfer.js for waveform visualization
- Beat grid: Client-side beat detection algorithm
- EQ: Web Audio API 3-band filter

## Performance & Scaling

**Current (MVP):**
- Single Node.js process
- Local file storage (`uploads/`)
- Socket.io in-memory adapter

**Future optimizations:**
- Redis adapter for Socket.io (multi-instance)
- S3/Cloudinary for audio storage
- CDN for waveform serving
- Database indexing on `SetEntry.position` + `roomId`

## Security Notes

- All input validated with Zod schemas
- JWT tokens for authentication (Phase 2.3)
- File uploads: type + size restrictions
- CORS configured for frontend origin only
- SQL injection prevented by Prisma ORM

## Testing Strategy

**Unit tests** (Vitest):
- Model functions (Prisma CRUD)
- Utility functions (beat grid, Camelot key)
- Validation schemas (Zod)

**Integration tests** (Vitest + Supertest):
- REST endpoints
- Database operations

**E2E tests** (Playwright):
- Room creation + joining
- File upload + playlist sync
- Drag & drop reordering
- Multi-client real-time sync

## Deployment (Planned)

**Backend:**
- Platform: Render / Railway / Fly.io
- Database: Neon / Supabase (managed PostgreSQL)
- File storage: S3 / Cloudinary

**Frontend:**
- Platform: Vercel / Netlify
- Build: Static Vite bundle

## Development Workflow

1. Start dev servers: `npm run dev` (runs backend + frontend concurrently)
2. Run tests before committing: `npm run test:all`
3. Type check: `npm run type-check`
4. Lint/format: `npm run lint:fix && npm run format`
5. Database changes: `npm run db:migrate`
