## Project: Listener — Collaborative Real-Time DJ Playlist Tool

### 🎧 Vision
Listener is a **real-time collaborative DJ set planner**.  
Two (or more) DJs can remotely curate, reorder, and annotate tracks together before a live performance.  
The app should feel like **“Google Docs for DJ sets”** — with version history, cue points, and transition notes.

---

## 🧠 Role of Claude Code
Claude Code acts as:
- **Pair programmer** for Node.js + Express + Socket.io backend
- **Frontend assistant** for React or Vue (to be decided)
- **Architect** suggesting scalable structure
- **Technical writer** for documentation and tests

Claude's goal: produce **small, incremental, tested changes** toward the MVP defined in `PLAN.md`.

---

## 🎭 Specialized Roles

Claude can assume different roles depending on the task at hand. Each role has specific responsibilities and perspectives.

### Available Roles

| Role | Purpose | When to Use |
|------|---------|-------------|
| **[Implementer](.vibe/roles/implementer.md)** | Write clean, tested production code | Feature development, bug fixes |
| **[Reviewer](.vibe/roles/reviewer.md)** | Review code for quality, security, bugs | Code review, quality assurance |
| **[UX Designer](.vibe/roles/ux-designer.md)** | Design intuitive, user-centered interfaces | UI/UX decisions, component design |
| **[Product DJ](.vibe/roles/product-dj.md)** | Align features with DJ workflow & product vision | Feature prioritization, scope decisions |

### How to Use Roles

**Invoke a role explicitly:**
```
"As Product DJ, should we prioritize BPM auto-detection or manual entry for MVP?"
"Review this code as the Reviewer role"
"As UX Designer, how should we display track energy levels?"
"Acting as Implementer, create the room creation endpoint"
```

**Multiple roles in sequence:**
```
1. Product DJ: "Should we add this feature?"
2. UX Designer: "How should it look?"
3. Implementer: "I'll build it"
4. Reviewer: "Here's my feedback"
```

**Default Mode:**
If no role is specified, Claude acts as a **generalist pair programmer** balancing all perspectives.

---

## 💡 MVP Scope (Reminder)
> See `PLAN.md` for feature details.

Focus for MVP:
- Real-time playlist collaboration between DJs  
- Basic user roles (DJ 1 / DJ 2)  
- Track metadata (title, artist, BPM, key)  
- Simple notes & cue points per transition  
- No audio playback or waveform view (planning only)

---

## 🧩 Architectural Overview
| Layer | Tech | Notes |
|-------|------|-------|
| **Backend** | Node.js + Express | REST + WebSocket endpoints |
| **Realtime** | Socket.io | For live playlist sync |
| **Frontend** | React (Vite or Next.js) | Realtime UI + drag & drop |
| **Database** | PostgreSQL (preferred) or MongoDB | Tracks / Playlists / Users |
| **Auth** | JWT (basic) | Upgrade later |
| **Testing** | Jest or Vitest | Unit + integration |

Claude must not introduce large framework shifts without explicit confirmation.

---

## 🪄 Development Principles

### 1. Small, Atomic Changes
- Always provide **diff-style** patches.  
- Limit edits to the files explicitly mentioned.  
- Explain briefly what & why before showing code.

### 2. Consistent Conventions
- Use **ES Modules** with async/await.  
- Prefer **TypeScript** (`.ts`) where possible.  
- Shared constants + types go in `/src/shared/`.  
- Socket event naming pattern:  
  - `playlist:*` → track operations  
  - `room:*` → user/session operations

### 3. Collaboration Patterns

```ts
// Server
socket.on('playlist:add-track', async (data) => {
  const track = await addTrack(data);
  io.to(roomId).emit('playlist:track-added', track);
});

// Client
socket.on('playlist:track-added', (track) => updateLocalPlaylist(track));
```

---

## ⚙️ Claude Collaboration Rules
1. Summarize understanding before major edits.  
2. Include minimal docstrings + type hints in new files.  
3. After implementation, always propose:
   - One quick manual or test-run command.  
   - One optional improvement idea.  
4. Ask before assuming new features or stack changes.  
5. Stay within MVP scope — advanced ideas go in `BACKLOG.md`.

---

## 🧱 Folder Structure
```
listener/
├── src/
│   ├── server/
│   │   ├── routes/       # REST endpoints
│   │   ├── sockets/      # WebSocket handlers
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Auth / validation
│   ├── client/
│   │   ├── components/   # UI components
│   │   ├── services/     # API / socket clients
│   │   └── utils/        # Helpers
│   └── shared/           # Shared types / constants
├── tests/                # Unit & integration tests
├── config/               # Environment & deployment
└── docs/                 # PLAN.md / ARCHITECTURE.md / etc.
```

---

## 🔐 Security & Stability Expectations
- Validate all input (Zod or manual).  
- Never trust client-provided room / user data.  
- JWT or session cookies for auth (simple).  
- Handle reconnection via Socket.io built-ins.  
- Use optimistic UI updates when reasonable.

---

## 🧪 Testing Guidance for Claude
- Add Jest / Vitest tests alongside new logic.  
- Include at least one realistic case.  
- Mock external APIs / DB calls.  
- For Socket.io: simulate 2 clients and verify broadcast.

---

## 🛠️ Performance & Scaling Notes
- Use namespaces for Socket.io rooms.  
- Avoid global broadcasts.  
- Redis adapter / queueing only after MVP.  
- Index DB queries when adding persistence.

---

## 🪪 Example Claude Tasks

**"Add track reordering to the playlist service"**
→ Claude edits `src/server/services/playlistService.ts`, adds `reorderTrack()`, updates socket handler, writes test.

**"Create a React component for track metadata display"**
→ Claude creates `src/client/components/TrackCard.tsx`, uses shared types, adds basic styling.

**"Implement room join flow"**
→ Claude updates REST endpoint, socket event handler, client service, and adds integration test.

**"Export playlist to CSV"**
→ Claude adds `/api/rooms/:id/export` endpoint, uses csv-stringify library, returns file download.

---

## ✅ Claude Checklist
Before submitting a change:
- [ ] Confirm goal & affected files  
- [ ] Provide concise diff  
- [ ] Add or update tests  
- [ ] Suggest validation step (`npm run dev` etc.)  
- [ ] Avoid unrelated refactors  

---

## 🧭 Post-MVP Ideas (Reference Only)
- BPM/key auto-analysis  
- AI “next track” suggestions  
- Role-based permissions and history merge  

---

## 🧰 Environment Variables (for Claude context)
Use placeholders — never real secrets.

```bash
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/listener
JWT_SECRET=changeme
ALLOWED_ORIGINS=http://localhost:5173
```

