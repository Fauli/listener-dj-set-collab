# Architecture Documentation

This document describes the technical architecture of Listener.

## System Overview

Listener is a full-stack TypeScript application with a Node.js backend and React frontend, connected via WebSocket for real-time collaboration.

```
┌──────────────┐         WebSocket/HTTP        ┌──────────────┐
│              │ ◄─────────────────────────────►│              │
│   React      │                                │   Express    │
│   Frontend   │         Socket.io              │   Backend    │
│   (Vite)     │ ◄─────────────────────────────►│   (Node.js)  │
│              │                                │              │
└──────────────┘                                └──────┬───────┘
                                                       │
                                                       ▼
                                                ┌──────────────┐
                                                │  PostgreSQL  │
                                                │   Database   │
                                                └──────────────┘
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: Socket.io
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT (basic)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: TailwindCSS
- **WebSocket Client**: Socket.io-client

### Database
- **RDBMS**: PostgreSQL
- **Schema Management**: Prisma Migrate

## Data Flow

### Room Creation Flow
1. User clicks "Create Room" in frontend
2. Frontend sends POST `/api/rooms`
3. Backend creates room in database
4. Backend returns room ID and join link
5. Frontend redirects to `/rooms/:id`

### Real-Time Collaboration Flow
1. User joins room via WebSocket connection
2. Server sends full playlist state on join
3. User modifies playlist (add/reorder/update)
4. Client sends WebSocket event
5. Server validates and persists change
6. Server broadcasts update to all room participants
7. Clients receive update and refresh UI

## Security Considerations

- Input validation on all endpoints (Zod schemas)
- Room access control (JWT-based authentication)
- Rate limiting on WebSocket events
- SQL injection prevention (Prisma)
- XSS protection (React auto-escaping)

## Deployment Architecture

(To be updated in future phases)

## Performance Optimizations

- Database query optimization with indexes
- WebSocket room-based broadcasting (not global)
- Client-side optimistic updates
- Efficient state diffing

---

For implementation details, see `PLAN.md`.
