# OAuth2 Authentication Setup Guide

This guide walks you through setting up OAuth2 authentication for the Listener application.

## Overview

Listener now supports multi-user authentication using OAuth2 with **Google** and **GitHub** as identity providers. Users can sign in with their Google or GitHub account to access the application.

## Prerequisites

- A Google Cloud Platform account (for Google OAuth)
- A GitHub account (for GitHub OAuth)
- Access to the Listener application codebase
- PostgreSQL database running

**Note**: You can configure one or both OAuth providers. Both are optional, but at least one is required for authentication to work.

## 1. OAuth Provider Setup

Choose one or both providers to configure:

- **Option A**: [Google OAuth Setup](#1a-google-cloud-console-setup) (recommended for most users)
- **Option B**: [GitHub OAuth Setup](#1b-github-oauth-setup) (great for developer-focused apps)
- **Option C**: Configure both for maximum flexibility

### 1A. Google Cloud Console Setup

### Step 1.1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "NEW PROJECT"
3. Name your project (e.g., "Listener App")
4. Click "CREATE"

### Step 1.2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and click "ENABLE"

### Step 1.3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (or "Internal" if using Google Workspace)
3. Click "CREATE"
4. Fill in the required fields:
   - **App name**: Listener
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "SAVE AND CONTINUE"
6. On "Scopes" page, click "ADD OR REMOVE SCOPES"
7. Add the following scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
8. Click "UPDATE" → "SAVE AND CONTINUE"
9. On "Test users" page (if External), add your test email addresses
10. Click "SAVE AND CONTINUE" → "BACK TO DASHBOARD"

### Step 1.4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Select application type: "Web application"
4. Name it: "Listener Web Client"
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:3000` (development)
   - `http://localhost:5173` (Vite dev server)
   - Your production domain (e.g., `https://listener.app`)
6. Under "Authorized redirect URIs", add:
   - `http://localhost:3000/auth/google/callback` (development)
   - Your production callback URL (e.g., `https://listener.app/auth/google/callback`)
7. Click "CREATE"
8. **IMPORTANT**: Copy your **Client ID** and **Client Secret** - you'll need these for the next step

### 1B. GitHub OAuth Setup

### Step 1.1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" in the left sidebar
3. Click "New OAuth App" button
4. Fill in the application details:
   - **Application name**: Listener (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (development) or your production URL
   - **Application description**: Optional description of your app
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
5. Click "Register application"

### Step 1.2: Get Client Credentials

1. After creating the app, you'll see your **Client ID** displayed
2. Click "Generate a new client secret"
3. **IMPORTANT**: Copy both your **Client ID** and **Client Secret** immediately
   - The client secret will only be shown once!
   - Store them securely - you'll need them for the `.env` file

### Step 1.3: Configure for Production (Optional)

When deploying to production:

1. Go back to your OAuth App settings
2. Update the URLs:
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/auth/github/callback`
3. Or create a separate OAuth App for production to keep environments isolated

## 2. Environment Configuration

### Step 2.1: Copy Environment Template

```bash
cp .env.example .env
```

### Step 2.2: Configure OAuth Variables

Edit your `.env` file and add the following:

```bash
# Session (for OAuth)
SESSION_SECRET=your-random-secret-key-at-least-32-characters-long

# OAuth2 - Google (optional - configure if using Google OAuth)
GOOGLE_CLIENT_ID=your-client-id-from-google-console
GOOGLE_CLIENT_SECRET=your-client-secret-from-google-console
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# OAuth2 - GitHub (optional - configure if using GitHub OAuth)
GITHUB_CLIENT_ID=your-client-id-from-github
GITHUB_CLIENT_SECRET=your-client-secret-from-github
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Client URL (for OAuth redirects)
CLIENT_URL=http://localhost:5173
```

**Note**: You only need to configure the OAuth provider(s) you want to use. If you only want GitHub auth, you can skip the Google variables and vice versa.

**Generate a secure SESSION_SECRET:**

```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 2.3: Verify Other Required Variables

Make sure these are also set in your `.env`:

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/listener

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 3. Database Migration

The OAuth2 fields have been added to the User model. If you haven't already run the migration:

```bash
# Option 1: Push schema changes (development)
npx prisma db push

# Option 2: Create and run migration (production-ready)
npx prisma migrate dev --name add_oauth_fields_to_user
```

### User Schema Changes

The following fields were added to the `User` model:

- `email` (String?, unique) - User's email from OAuth provider
- `avatarUrl` (String?) - Profile picture URL
- `provider` (String?) - OAuth provider name (e.g., "google")
- `providerId` (String?) - OAuth provider's user ID

## 4. Start the Application

### Terminal 1: Start the server

```bash
npm run dev:server
```

You should see:
```
🎧 Listener server running on http://localhost:3000
📚 API Documentation: http://localhost:3000/api-docs
```

### Terminal 2: Start the client

```bash
npm run dev:client
```

## 5. Testing OAuth2 Flow

### Manual Testing

1. **Open your browser** to `http://localhost:5173`

2. **Initiate OAuth Login:**

   **Option A - Google Login:**
   - Navigate to `http://localhost:3000/auth/google`
   - You'll be redirected to Google's OAuth consent screen
   - Select your Google account
   - Review permissions (email, profile)
   - Click "Allow"

   **Option B - GitHub Login:**
   - Navigate to `http://localhost:3000/auth/github`
   - You'll be redirected to GitHub's OAuth authorization page
   - Click "Authorize [your-app-name]"

3. **Verify Redirect:**
   - You should be redirected back to `http://localhost:5173`
   - You're now authenticated!

5. **Check Current User:**
   ```bash
   curl http://localhost:3000/auth/me --cookie-jar cookies.txt --cookie cookies.txt
   ```

   Expected response:
   ```json
   {
     "id": "uuid-here",
     "email": "your@email.com",
     "name": "Your Name",
     "avatarUrl": "https://lh3.googleusercontent.com/...",
     "role": "listener"
   }
   ```

6. **Logout:**
   ```bash
   curl -X POST http://localhost:3000/auth/logout --cookie cookies.txt
   ```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google` | GET | Initiate Google OAuth flow |
| `/auth/google/callback` | GET | Google OAuth callback |
| `/auth/github` | GET | Initiate GitHub OAuth flow |
| `/auth/github/callback` | GET | GitHub OAuth callback |
| `/auth/me` | GET | Get current authenticated user |
| `/auth/logout` | POST | Logout current user |

## 6. Frontend Integration (Next Steps)

The backend OAuth2 is now ready. To complete the integration:

### Create Auth Context (React)

Create `src/client/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';

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
  loginWithGoogle: () => void;
  loginWithGitHub: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    fetch('http://localhost:3000/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = () => {
    // Redirect to Google OAuth
    window.location.href = 'http://localhost:3000/auth/google';
  };

  const loginWithGitHub = () => {
    // Redirect to GitHub OAuth
    window.location.href = 'http://localhost:3000/auth/github';
  };

  const logout = async () => {
    await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithGitHub, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Add Login Buttons

```typescript
import { useAuth } from '../contexts/AuthContext';

function LoginButtons() {
  const { user, loading, loginWithGoogle, loginWithGitHub, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <img src={user.avatarUrl} alt={user.name} />
        <span>{user.name}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={loginWithGoogle}>Sign in with Google</button>
      <button onClick={loginWithGitHub}>Sign in with GitHub</button>
    </div>
  );
}
```

## 7. Troubleshooting

### "Google/GitHub OAuth not configured" warning

**Issue**: Server logs show: `⚠️  Google OAuth not configured` or `⚠️  GitHub OAuth not configured`

**Solution**: Make sure the respective OAuth credentials are set in `.env`:
- For Google: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- For GitHub: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`

**Note**: It's okay if one provider shows a warning if you're only using the other provider.

### "Not authenticated" when calling /auth/me

**Issue**: API returns `{ "error": "Not authenticated" }`

**Solution**:
- Make sure you're sending cookies with the request
- Use `credentials: 'include'` in fetch requests
- Verify SESSION_SECRET is set in `.env`

### Redirect URI mismatch error

**Issue**: Google shows "redirect_uri_mismatch" error

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client
3. Verify "Authorized redirect URIs" includes exact callback URL
4. Make sure `GOOGLE_CALLBACK_URL` in `.env` matches

### CORS errors when calling auth endpoints

**Issue**: Browser shows CORS policy errors

**Solution**:
- Verify `ALLOWED_ORIGINS` in `.env` includes your frontend URL
- Make sure `credentials: true` is set in CORS config (already done in code)

### Session not persisting

**Issue**: User is logged out after page refresh

**Solution**:
- Check that `SESSION_SECRET` is set in `.env`
- Verify cookies are being set (check browser DevTools → Application → Cookies)
- In production, make sure `NODE_ENV=production` for secure cookies

## 8. Production Deployment

### Update Environment Variables

```bash
NODE_ENV=production
SESSION_SECRET=use-different-secret-in-production

# Update URLs to production domains (Google)
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback

# Update URLs to production domains (GitHub)
GITHUB_CALLBACK_URL=https://your-domain.com/auth/github/callback

# Client URL
CLIENT_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
```

### Update OAuth Provider Settings

**For Google Cloud Console:**

1. Go to "APIs & Services" → "Credentials"
2. Edit your OAuth 2.0 Client
3. Add production URLs to:
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/auth/google/callback`

**For GitHub OAuth App:**

1. Go to your [GitHub OAuth App settings](https://github.com/settings/developers)
2. Either update your existing app or create a new production app
3. Update the URLs:
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/auth/github/callback`

### SSL/HTTPS Requirement

**Both Google and GitHub OAuth require HTTPS** in production. Make sure your production server has a valid SSL certificate.

## 9. Security Best Practices

1. ✅ **Never commit `.env` file** - it's already in `.gitignore`
2. ✅ **Use different secrets** for development and production
3. ✅ **Rotate secrets** periodically
4. ✅ **Use HTTPS** in production (required by Google)
5. ✅ **Limit OAuth scopes** to only what you need (email, profile)
6. ✅ **Validate user data** on the backend (already implemented)
7. ✅ **Use HTTP-only cookies** (already configured)

## 10. Next Features

Now that OAuth2 is working, you can implement:

- [ ] Socket.io authentication middleware
- [ ] Protected API endpoints (require authentication)
- [ ] User profile management
- [ ] Room access control (owner-only features)
- [ ] Role-based permissions (DJ vs. Listener)

See `/docs/OAUTH2_MULTI_USER_PLAN.md` for the full implementation roadmap.

## Support

If you encounter issues:

1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Test the auth flow step-by-step using curl or Postman
4. Review the Google Cloud Console configuration

For more details on the architecture, see:
- `/docs/OAUTH2_MULTI_USER_PLAN.md` - Complete implementation plan
- `/docs/ARCHITECTURE.md` - System architecture
- `/src/server/config/passport.ts` - Passport configuration
- `/src/server/routes/auth.ts` - Auth endpoints
