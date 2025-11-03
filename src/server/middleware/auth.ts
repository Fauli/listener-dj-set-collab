/**
 * Authentication middleware
 * Provides middleware functions for protecting routes
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Middleware to ensure user is an admin
 * Admins are configured via ADMIN_EMAILS environment variable (comma-separated list)
 * Example: ADMIN_EMAILS=admin@example.com,owner@djapp.com
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user as any;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((email) => email.trim()) || [];

  if (!adminEmails.includes(user.email)) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Only administrators can access this resource',
    });
  }

  next();
}

/**
 * Middleware to check if user owns a specific room
 * Requires roomId parameter in route
 */
export function requireRoomOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Room ownership check will be implemented when needed
  // For now, just ensure user is authenticated
  next();
}
