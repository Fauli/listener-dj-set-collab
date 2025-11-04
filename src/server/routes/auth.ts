/**
 * Authentication routes for OAuth2
 */

import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { logInfo, logDebug } from '../middleware/logger.js';

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
    logInfo('Initiating GitHub OAuth login');
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
    logInfo('GitHub callback received');
    next();
  },
  passport.authenticate('github', {
    failureRedirect: process.env.CLIENT_URL || 'http://localhost:5173',
  }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect to client
    logInfo('GitHub authentication successful', {
      userEmail: (req.user as any)?.email,
    });
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
  logDebug('/auth/me called', {
    isAuthenticated: req.isAuthenticated(),
    sessionId: req.sessionID,
    user: req.user ? (req.user as { email?: string }).email : 'none',
  });

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.user as { id: string; email: string; name: string; avatarUrl?: string; role: string };
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

export default router;
