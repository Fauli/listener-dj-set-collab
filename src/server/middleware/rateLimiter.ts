/**
 * Rate limiting middleware to prevent DoS attacks and abuse
 */

import rateLimit from 'express-rate-limit';
import { logWarn } from './logger.js';

/**
 * General API rate limiter - applies to most endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logWarn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: 900, // 15 minutes
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    logWarn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Account temporarily locked due to multiple failed attempts. Please try again later.',
      retryAfter: 900, // 15 minutes
    });
  },
});

/**
 * Strict rate limiter for file uploads
 * 10 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      error: 'Too many file uploads',
      message: 'You have exceeded the file upload limit. Please try again later.',
      retryAfter: 3600, // 1 hour
    });
  },
});

/**
 * WebSocket rate limiter tracking object
 * Tracks connections per IP to prevent WebSocket flooding
 */
interface WebSocketRateLimitEntry {
  count: number;
  resetTime: number;
}

const websocketRateLimits = new Map<string, WebSocketRateLimitEntry>();

/**
 * Clean up expired rate limit entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of websocketRateLimits.entries()) {
    if (entry.resetTime < now) {
      websocketRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * WebSocket connection rate limiter
 * Limits WebSocket connections to prevent flooding
 * @param ip - Client IP address
 * @param maxConnections - Maximum connections allowed per window
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function checkWebSocketRateLimit(
  ip: string,
  maxConnections: number = 50,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = websocketRateLimits.get(ip);

  // No entry or expired - create new entry
  if (!entry || entry.resetTime < now) {
    websocketRateLimits.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > maxConnections) {
    logWarn('WebSocket rate limit exceeded', { ip, count: entry.count });
    return true;
  }

  return false;
}

/**
 * Reset WebSocket rate limit for an IP (called on successful disconnect)
 */
export function decrementWebSocketRateLimit(ip: string): void {
  const entry = websocketRateLimits.get(ip);
  if (entry && entry.count > 0) {
    entry.count--;
    if (entry.count === 0) {
      websocketRateLimits.delete(ip);
    }
  }
}
