# OAuth2 Multi-User Authentication - Feature Plan

## Current State Analysis

### What We Have:
- **Hardcoded User ID**: `TEMP_USER_ID = 'f1aaa777-5fd9-4eac-88a5-02c46db731fa'` (DJ Alpha)
- **Database Schema**: Already supports multiple users with User model
- **Session Management**: Tracks active users in rooms via Session model
- **Role System**: Users have roles ('dj1', 'dj2', 'listener') but not enforced
- **Room Ownership**: Rooms have an `ownerId` field

### What's Missing:
- No authentication system
- No login/logout flow
- No user profile management
- No authorization/permissions
- No way to create new users
- Frontend assumes everyone is DJ Alpha

---

## Feature Scope: OAuth2 + Session-Based Auth

### Goals:
1. Users can sign in with Google OAuth2 (extensible to GitHub, etc.)
2. Proper session management with HTTP-only cookies
3. User profiles with customizable DJ names
4. Room access control (public vs. private rooms)
5. Role-based permissions
6. Seamless real-time collaboration between authenticated users

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (React)                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ LoginPage   │  │ AuthContext  │  │ RoomPage     │      │
│  │ - OAuth btn │→ │ - user state │→ │ - Join room  │      │
│  └─────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/Socket.io
┌─────────────────────────────────────────────────────────────┐
│  SERVER (Express + Socket.io)                               │
│  ┌─────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Auth Routes     │  │ Session Store  │  │ Socket Auth │ │
│  │ /auth/google    │  │ express-session│  │ Middleware  │ │
│  │ /auth/callback  │  │ + Redis/Memory │  │             │ │
│  │ /auth/me        │  └────────────────┘  └─────────────┘ │
│  │ /auth/logout    │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                 ┌──────────────────┐
                 │  Google OAuth2   │
                 │  Provider        │
                 └──────────────────┘
```

---

## Database Schema Changes

### Updated User Model

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique        // NEW: Email from OAuth provider
  name      String                  // Display name (e.g., "DJ Alpha")
  avatarUrl String?                 // NEW: Profile picture from OAuth
  role      String   @default("listener") // 'dj', 'listener', 'admin'

  // OAuth fields
  provider  String?                 // NEW: 'google', 'github', etc.
  providerId String?                // NEW: OAuth provider's user ID

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt     // NEW: Track profile updates

  ownedRooms Room[]     @relation("RoomOwner")
  sessions   Session[]

  @@unique([provider, providerId])  // NEW: Prevent duplicate OAuth accounts
  @@index([email])
}
```

### Updated Room Model (Optional Enhancements)

```prisma
model Room {
  id          String   @id @default(uuid())
  name        String
  isPublic    Boolean  @default(true)   // NEW: Public vs private rooms
  inviteCode  String?  @unique          // NEW: Optional invite code for private rooms
  createdAt   DateTime @default(now())
  ownerId     String

  owner      User        @relation("RoomOwner", fields: [ownerId], references: [id])
  setEntries SetEntry[]
  sessions   Session[]

  @@index([ownerId])
  @@index([inviteCode])
}
```

---

## Implementation Phases

### **Phase 1: Backend OAuth2 Setup** (Priority: HIGH)

#### 1.1 Install Dependencies
```bash
npm install passport passport-google-oauth20 express-session
npm install --save-dev @types/passport @types/passport-google-oauth20 @types/express-session
```

#### 1.2 Create Auth Configuration
**File**: `src/server/config/auth.ts`
```typescript
export const authConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  },
  session: {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  },
};
```

#### 1.3 Passport Strategy Setup
**File**: `src/server/auth/passport.ts`
```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { authConfig } from '../config/auth.js';
import { findOrCreateUserFromOAuth } from '../models/User.js';

// Serialize user to session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    authConfig.google,
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUserFromOAuth({
          provider: 'google',
          providerId: profile.id,
          email: profile.emails?.[0]?.value || '',
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value,
        });
        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);
```

#### 1.4 User Model Service
**File**: `src/server/models/User.ts`
```typescript
interface OAuthUserData {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function findOrCreateUserFromOAuth(data: OAuthUserData) {
  // Find existing user by OAuth provider
  let user = await prisma.user.findUnique({
    where: {
      provider_providerId: {
        provider: data.provider,
        providerId: data.providerId,
      },
    },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        provider: data.provider,
        providerId: data.providerId,
        role: 'listener', // Default role
      },
    });
  }

  return user;
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
  return prisma.user.update({
    where: { id: userId },
    data: updates,
  });
}
```

#### 1.5 Auth Routes
**File**: `src/server/routes/auth.ts`
```typescript
import express from 'express';
import passport from 'passport';

const router = express.Router();

// Start OAuth flow
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=auth_failed'
  }),
  (req, res) => {
    // Successful authentication
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

export default router;
```

#### 1.6 Server Setup
**File**: `src/server/index.ts` (modifications)
```typescript
import session from 'express-session';
import passport from 'passport';
import authRoutes from './routes/auth.js';
import './auth/passport.js'; // Initialize passport strategies

// Session middleware (BEFORE passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.use('/auth', authRoutes);
```

---

### **Phase 2: Socket.io Authentication** (Priority: HIGH)

#### 2.1 Socket Auth Middleware
**File**: `src/server/sockets/authMiddleware.ts`
```typescript
import { Socket } from 'socket.io';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const session = (socket.request as any).session;

  if (!session || !session.passport || !session.passport.user) {
    return next(new Error('Authentication required'));
  }

  // Attach user ID to socket
  socket.data.userId = session.passport.user;
  next();
}
```

#### 2.2 Server Socket Setup
**File**: `src/server/index.ts` (Socket.io modifications)
```typescript
import { socketAuthMiddleware } from './sockets/authMiddleware.js';
import sessionMiddleware from './middleware/session.js'; // Shared session

// Share session with Socket.io
io.engine.use(sessionMiddleware);

// Require authentication for socket connections
io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  console.log(`User ${userId} connected via socket ${socket.id}`);

  // Rest of socket handlers...
});
```

#### 2.3 Updated Room Handlers
**File**: `src/server/sockets/roomHandlers.ts` (modifications)
```typescript
socket.on('room:join', async (data: { roomId: string }, callback) => {
  try {
    const userId = socket.data.userId; // From auth middleware

    // Create session
    const session = await createSession({
      userId,
      roomId: data.roomId,
      socketId: socket.id,
    });

    // Join socket room
    socket.join(data.roomId);

    // Get room state
    const roomState = await getRoomState(data.roomId);

    // Notify others
    socket.to(data.roomId).emit('room:user-joined', {
      user: session.user,
      timestamp: new Date().toISOString(),
    });

    callback({ success: true, roomState });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

---

### **Phase 3: Frontend Authentication** (Priority: HIGH)

#### 3.1 Auth Context
**File**: `src/client/contexts/AuthContext.tsx`
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    fetch('http://localhost:3000/auth/me', {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = 'http://localhost:3000/auth/google';
  };

  const logout = async () => {
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

#### 3.2 Login Page
**File**: `src/client/components/LoginPage.tsx`
```typescript
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Listener
        </h1>
        <p className="text-gray-400 mb-8 text-center">
          Collaborative DJ Set Planner
        </p>

        <button
          onClick={login}
          className="w-full bg-white text-gray-900 py-3 px-6 rounded-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            {/* Google icon SVG */}
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
```

#### 3.3 Protected Routes
**File**: `src/client/components/ProtectedRoute.tsx`
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

#### 3.4 Update App Router
**File**: `src/client/App.tsx`
```typescript
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './components/LoginPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <ProtectedRoute>
              <RoomPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
```

#### 3.5 Update RoomPage
**File**: `src/client/components/RoomPage.tsx` (modifications)
```typescript
import { useAuth } from '../contexts/AuthContext';

export default function RoomPage() {
  const { user } = useAuth(); // Get authenticated user
  const { roomId } = useParams<{ roomId: string }>();

  // Remove: const TEMP_USER_ID = 'f1aaa777-5fd9-4eac-88a5-02c46db731fa';

  useEffect(() => {
    if (!roomId || !user) return;

    // Join room with authenticated user ID
    joinRoom(roomId, user.id);

    // ... rest of room logic
  }, [roomId, user]);
}
```

---

### **Phase 4: User Profile & Settings** (Priority: MEDIUM)

#### 4.1 Profile Page
**Features:**
- Edit DJ name
- View profile stats (rooms created, sessions joined)
- Role display
- Account settings

#### 4.2 API Endpoints
```
PATCH /api/users/me        - Update profile
GET   /api/users/:id       - Get user profile (public)
```

---

### **Phase 5: Room Access Control** (Priority: LOW)

#### 5.1 Features:
- Public rooms (anyone can join)
- Private rooms (invite code required)
- Room member management (kick/ban)

#### 5.2 Permission System:
- Room owner can manage room settings
- Only DJs can modify playlist
- Listeners can only view

---

## Environment Variables

### Required `.env` additions:
```bash
# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Session
SESSION_SECRET=your_super_secret_session_key_here

# URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
```

### Setting up Google OAuth2:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

---

## Migration Strategy

### Step 1: Database Migration
```bash
npx prisma migrate dev --name add_oauth_fields
```

### Step 2: Update Seed Script
Keep DJ Alpha for testing, but mark as OAuth user:
```typescript
const dj1 = await prisma.user.upsert({
  where: { id: 'f1aaa777-5fd9-4eac-88a5-02c46db731fa' },
  update: {},
  create: {
    id: 'f1aaa777-5fd9-4eac-88a5-02c46db731fa',
    email: 'dj-alpha@example.com',
    name: 'DJ Alpha',
    role: 'dj',
    provider: 'local', // For testing
  },
});
```

### Step 3: Gradual Rollout
1. Implement backend auth (Phase 1 + 2)
2. Test with Postman/curl
3. Implement frontend auth (Phase 3)
4. Test E2E flow
5. Remove hardcoded user ID
6. Deploy to production

---

## Testing Plan

### Unit Tests:
- [ ] OAuth user creation
- [ ] Session serialization/deserialization
- [ ] Socket auth middleware
- [ ] User profile updates

### Integration Tests:
- [ ] Full OAuth flow (mocked)
- [ ] Authenticated API requests
- [ ] Socket.io with session

### E2E Tests:
- [ ] Login flow
- [ ] Join room as authenticated user
- [ ] Multi-user collaboration
- [ ] Logout flow

---

## Security Considerations

### ✅ Implemented:
- HTTP-only cookies
- CSRF protection via SameSite cookies
- Secure cookies in production
- Session expiration (7 days)

### 🔄 To Implement:
- Rate limiting on auth endpoints
- CORS whitelist for production
- Input validation for profile updates
- SQL injection protection (Prisma handles this)

### ⚠️ Important:
- Never expose `SESSION_SECRET` in git
- Use environment-specific OAuth redirect URLs
- Implement proper error handling for OAuth failures

---

## Future Enhancements (Post-MVP)

1. **Additional OAuth Providers**: GitHub, Spotify, Apple
2. **Email/Password Auth**: For users without OAuth accounts
3. **Two-Factor Authentication**: Optional 2FA for account security
4. **Room Invitations**: Email/link-based invites
5. **User Blocking**: Prevent specific users from joining your rooms
6. **Activity Log**: Track who made which changes to playlist
7. **User Preferences**: Theme, notification settings, etc.

---

## Success Criteria

- [ ] Users can sign in with Google OAuth2
- [ ] Multiple users can join the same room simultaneously
- [ ] Each user sees their own name/avatar in the UI
- [ ] Room ownership is properly enforced
- [ ] Sessions persist across page refreshes
- [ ] All existing features work with authenticated users
- [ ] E2E tests pass with authenticated flows

---

## Implementation Timeline

| Phase | Estimated Time | Dependencies |
|-------|---------------|--------------|
| Phase 1: Backend OAuth | 4-6 hours | None |
| Phase 2: Socket Auth | 2-3 hours | Phase 1 |
| Phase 3: Frontend Auth | 3-4 hours | Phase 1, 2 |
| Phase 4: User Profile | 2-3 hours | Phase 3 |
| Phase 5: Access Control | 3-4 hours | Phase 3 |
| **Total** | **14-20 hours** | |

---

## Questions to Resolve

1. **Role Assignment**: How should new users get DJ role? Auto-assign? Request-based? Room owner assigns?
2. **Room Limits**: Should users have a limit on # of rooms they can create?
3. **Anonymous Listeners**: Should we allow unauthenticated "view-only" mode for public rooms?
4. **Data Retention**: How long should inactive sessions stay in database?
5. **Profile Customization**: How much control do users have over their profile (DJ name, bio, etc.)?

---

## Next Steps

1. Review this plan with stakeholders
2. Get Google OAuth credentials
3. Create feature branch: `feat/oauth2-auth`
4. Start with Phase 1 (backend setup)
5. Test thoroughly at each phase
6. Update documentation as we go

Ready to implement! 🎧
