# PLAN.md
## Project: Listener — Collaborative Real-Time DJ Playlist Tool

### 🎧 Vision
Listener is a **real-time collaborative DJ set planner** for DJs who want to prepare their sets together remotely.  
Two DJs can connect, share their music ideas, and build a cohesive set — track by track — in sync.  
They can reorder tracks, annotate transitions, add cue points, and see all changes live.

The goal: make collaborative DJ planning as natural and dynamic as performing together.

---

## 🧭 Core Principles
1. **Real-time collaboration** — every update is instantly visible to all participants.
2. **Simplicity first** — no playback, no file uploads, just efficient planning.
3. **History-aware** — actions (add/remove/reorder) are tracked for later review.
4. **Metadata-driven** — track info (BPM, key, energy, transition notes) powers intelligent flow.
5. **Designed for two DJs** — roles and permissions are simple, personal, and fast.

---

## 🧩 MVP Goals (Phase 1)
Deliver a working prototype that allows two DJs to collaboratively plan a set in real time.

### ✅ Functional Goals
| Feature | Description | Acceptance Criteria |
|----------|--------------|---------------------|
| **Room Creation & Join** | Create a shared workspace (“room”) | - `/create` endpoint creates new room with unique ID<br>- URL join link works from another browser |
| **Playlist Management** | Add, remove, reorder tracks | - DJs can add track (title, artist, BPM, key)<br>- Drag & drop reordering updates instantly |
| **Realtime Sync** | WebSocket live updates | - Second client sees updates within 500ms<br>- Reconnect resumes latest state |
| **Track Metadata** | Support BPM, key, notes | - DJs can view/edit metadata fields<br>- Changes are persisted |
| **Transition Notes** | Add per-track notes | - Notes are synced and editable |
| **Simple Roles** | DJ1 (owner) & DJ2 (collaborator) | - Owner can invite<br>- Collaborator can edit playlist |
| **Persistence** | Store data in Postgres | - Playlist state survives page reload |
| **Export Set** | Export to CSV | - “Export” button downloads ordered playlist with metadata |

---

## 🚫 Non-Goals (MVP)
- No actual audio playback or waveform visualization  
- No Spotify/SoundCloud integration (later phase)  
- No complex authentication (simple session or token-based join)  
- No offline mode  
- No AI track suggestions yet  

---

## 🧱 Architecture Summary
| Layer | Purpose | Tech Stack |
|--------|----------|------------|
| **Backend API** | REST endpoints for room/playlist management | Node.js + Express |
| **Realtime Layer** | Live updates | Socket.io |
| **Database** | Persistent storage | PostgreSQL (via Prisma or Sequelize) |
| **Frontend UI** | Collaborative interface | React (Vite or Next.js) + Tailwind |
| **State Mgmt** | Local + synced state | Zustand or Redux |
| **Testing** | Logic and sync validation | Vitest / Jest |
| **Deployment (later)** | Hosting | Vercel (frontend) + Render/Neon (backend) |

---

## 🧮 Core Entities
| Entity | Fields | Description |
|---------|---------|-------------|
| **User** | `id`, `name`, `role` | Minimal identity, possibly anonymous |
| **Room** | `id`, `name`, `createdAt` | Workspace shared by DJs |
| **Track** | `id`, `title`, `artist`, `bpm`, `key`, `energy`, `sourceURI` | Represents a song |
| **SetEntry** | `id`, `roomId`, `trackId`, `position`, `note`, `createdAt` | Ordered track in the playlist |
| **History** (stretch) | `id`, `action`, `timestamp`, `userId`, `payload` | Keeps change logs |

---

## 🔁 Core Flows

### 1. Create Room
- User hits “Create Room” → POST `/api/rooms`
- Server returns room ID and join link
- Client redirects to `/rooms/:id`

### 2. Join Room
- Second user opens link
- Joins WebSocket channel `room:<id>`
- Receives full playlist state on connect

### 3. Modify Playlist
- User adds / reorders / removes track
- Emits WebSocket event (`playlist:update`)
- Server validates + broadcasts delta

### 4. Export Set
- Client requests `/api/rooms/:id/export`
- Server returns CSV with track order + metadata

---

## ⚙️ WebSocket Event Model
| Direction | Event | Payload | Description |
|------------|--------|----------|--------------|
| → Server | `room:join` | `{ roomId, user }` | Join room |
| → Server | `playlist:add-track` | `{ track }` | Add new track |
| → Server | `playlist:reorder` | `{ from, to }` | Reorder track |
| → Server | `playlist:update-note` | `{ trackId, note }` | Update notes |
| ← Client | `playlist:state` | `{ tracks: [...] }` | Full playlist sync |
| ← Client | `playlist:track-added` | `{ track }` | Notify new track |
| ← Client | `playlist:updated` | `{ delta }` | Incremental updates |
| ← Client | `user:joined` | `{ name }` | Show presence updates |

---

## 🧪 Test Scenarios (for Claude to validate)
1. Two users join same room → both see same track list.  
2. DJ1 adds track → DJ2 sees instantly.  
3. DJ2 reorders track → both lists update correctly.  
4. DJ1 adds note → syncs correctly.  
5. Refresh → playlist reloaded from DB.  
6. Invalid payload → error event emitted (no crash).  
7. Export → valid CSV downloaded.

---

## 🧱 Phase 1 Milestones

| Phase | Deliverable | Definition of Done |
|--------|--------------|--------------------|
| **1. Project Setup** | Repo scaffold with Express, Socket.io, React | Runs `npm run dev` successfully |
| **2. Data Models** | Room, Track, SetEntry models | Migration + seed runs |
| **3. REST API** | Create/read/update playlists | CRUD works with Postman |
| **4. WebSocket Sync** | Real-time room updates | 2 tabs update live |
| **5. Frontend UI** | Basic React interface | Add/reorder works visually |
| **6. Export Feature** | CSV export | File downloads correctly |
| **7. Tests & Docs** | Basic test coverage + README | CI passes, docs clear |

---

## 🧭 Future Roadmap (Post-MVP)
| Category | Idea | Notes |
|-----------|------|-------|
| **Music Analysis** | Auto-detect BPM/key via API | Optional server job |
| **Integrations** | Spotify, Beatport, YouTube | For metadata import |
| **Playback Mode** | Cue-based crossfade preview | Later version |
| **AI Assistant** | Suggest next track by compatibility | Optional |
| **Auth & Roles** | OAuth + multiple editors | Scale-up phase |
| **History View** | Timeline of edits | Future enhancement |

---

## 🧱 Development Philosophy
- Ship small, testable vertical slices.  
- Prioritize clarity over completeness.  
- Ask Claude for diffs and minimal patches.  
- Refactor only when needed to support new features.  
- Keep `PLAN.md` updated as scope evolves.

---

## 🧭 Quick Next Steps
1. Initialize repo and basic folder structure.  
2. Implement Room + Track models (in-memory or Postgres).  
3. Add REST endpoints: `/rooms`, `/rooms/:id/tracks`.  
4. Implement WebSocket join + add-track events.  
5. Create React client with real-time playlist view.  
6. Add CSV export button.  

Once MVP is working → add notes + simple roles.

---

**Summary:**  
`PLAN.md` defines the *what and when* for the Listener MVP — enabling Claude Code and contributors to move step-by-step toward a working collaborative DJ set planner that feels alive, fast, and fun.