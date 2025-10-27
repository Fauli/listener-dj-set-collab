# Listener 🎧  
### Collaborative Real-Time DJ Playlist Tool

**Listener** is a real-time collaborative web application that lets **two or more DJs** plan and refine a DJ set together — live, from anywhere.  
You can add, reorder, and annotate tracks, share transitions and cue points, and instantly see your partner’s updates in real time.

It’s like **Google Docs for DJ sets** — built for creative collaboration, not streaming.

---

## 🚀 Features

- 🧑‍🤝‍🧑 Real-time shared playlist editing (Socket.io)
- 🎵 Track metadata: artist, title, BPM, key, energy
- 🗒️ Add notes and cue information per track
- 🔁 Drag-and-drop reordering
- 🧩 Room-based collaboration (DJ1 & DJ2)
- 💾 Persistent storage (PostgreSQL)
- 📤 Export set lists to CSV
- ⚙️ Built with Node.js, Express, Socket.io, and React

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-------------|
| Backend | Node.js + Express |
| Realtime | Socket.io |
| Database | PostgreSQL (via Prisma or Sequelize) |
| Frontend | React (Vite or Next.js) + TailwindCSS |
| Testing | Vitest or Jest |
| Auth | Simple JWT or token link (MVP) |

---

## 📦 Getting Started

### 1️⃣ Clone & install
```bash
git clone https://github.com/yourname/listener.git
cd listener
npm install
```

### 2️⃣ Set up environment
```bash
cp .env.example .env
# Edit .env with your local database credentials
```

### 3️⃣ Run database migrations
```bash
npm run db:migrate
```

### 4️⃣ Start development servers
```bash
# Terminal 1: Backend server
npm run dev:server

# Terminal 2: Frontend dev server
npm run dev:client
```

### 5️⃣ Open in browser
```
http://localhost:5173
```

---

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 📚 Documentation

- **[PLAN.md](./docs/PLAN.md)** — Full feature spec, MVP scope, and roadmap
- **[CLAUDE.md](./CLAUDE.md)** — AI assistant collaboration guide
- **[Architecture docs](./docs/)** — Technical architecture and design decisions

---

## 🔧 Development

### Project Structure
```
listener/
├── src/
│   ├── server/          # Node.js backend
│   ├── client/          # React frontend
│   └── shared/          # Shared types & constants
├── tests/               # Test suites
├── config/              # Configuration files
└── docs/                # Documentation
```

### Key Commands
```bash
npm run dev              # Run both servers concurrently
npm run build            # Build for production
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

---

## 🤝 Contributing

This is an early-stage MVP. Contributions welcome!
1. Review `PLAN.md` for current scope
2. Follow conventions in `CLAUDE.md`
3. Submit small, tested PRs
4. Run tests before committing

---

## 📝 License

MIT

---

## 🧠 Built with Claude Code

This project is being developed collaboratively with [Claude Code](https://claude.com/claude-code) — see `CLAUDE.md` for AI collaboration guidelines