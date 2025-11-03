/**
 * Authentication routes for OAuth2
 */

import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';

const router = express.Router();

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     description: Redirects to Google for authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the callback from Google OAuth
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to client application
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: process.env.CLIENT_URL || 'http://localhost:5173',
  }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect to client
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(clientUrl);
  }
);

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     description: Redirects to GitHub for authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth
 */
router.get(
  '/github',
  (req, res, next) => {
    console.log('🚀 Initiating GitHub OAuth login');
    next();
  },
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     description: Handles the callback from GitHub OAuth
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to client application
 */
router.get(
  '/github/callback',
  (req, res, next) => {
    console.log('🔙 GitHub callback received');
    next();
  },
  passport.authenticate('github', {
    failureRedirect: process.env.CLIENT_URL || 'http://localhost:5173',
  }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect to client
    console.log('✅ GitHub authentication successful, redirecting to client');
    console.log('👤 Authenticated user:', (req.user as any)?.email);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(clientUrl);
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the currently authenticated user's information
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 name:
 *                   type: string
 *                 avatarUrl:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
router.get('/me', (req: Request, res: Response) => {
  console.log('🔍 /auth/me called, isAuthenticated:', req.isAuthenticated());
  console.log('🍪 Session ID:', req.sessionID);
  console.log('👤 User in session:', req.user ? (req.user as any).email : 'none');

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.user as any;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  });
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current user
 *     description: Logs out the current user and destroys the session
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       500:
 *         description: Error logging out
 */
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json({ message: 'Logged out successfully' });
  });
});

/**
 * @swagger
 * /auth/test-login:
 *   post:
 *     summary: Test-only login endpoint for E2E tests
 *     description: Creates a test user and authenticates the session (only available in test/development mode)
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the test user to login as
 *     responses:
 *       200:
 *         description: Successfully logged in as test user
 *       403:
 *         description: Test login not available in production
 *       404:
 *         description: User not found
 */
router.post('/test-login', async (req: Request, res: Response) => {
  // Only allow test login in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test login not available in production' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Import prisma to fetch user
  const { prisma } = await import('../db/client.js');

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Manually set the user in the session (simulating passport login)
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to login' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
      });
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
