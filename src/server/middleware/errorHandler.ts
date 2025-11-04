/**
 * Centralized error handling middleware
 * Prevents stack traces from leaking to clients in production
 */

import type { Request, Response, NextFunction } from 'express';
import { logError } from './logger.js';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Operational errors are expected errors (validation, not found, etc.)

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  stack?: string;
  details?: unknown;
}

/**
 * Global error handling middleware
 * MUST be registered after all routes
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Default to 500 server error
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const isOperational = 'isOperational' in err ? err.isOperational : false;

  // Log error details (with full stack trace for debugging)
  logError(
    `Error ${statusCode}: ${err.message}`,
    err,
    {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: (req as unknown as { user?: { id: string } }).user?.id,
      isOperational,
    }
  );

  // Build error response
  const response: ErrorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message: isOperational ? err.message : 'An unexpected error occurred',
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
    response.details = err;
  }

  // Send error response
  res.status(statusCode).json(response);
}

/**
 * 404 Not Found handler
 * Should be registered after all routes but before error handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(`Route not found: ${req.method} ${req.path}`, 404);
  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error handler
 * Formats Zod validation errors into user-friendly messages
 */
export function handleValidationError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null && 'issues' in error) {
    const issues = error.issues as Array<{ path: (string | number)[]; message: string }>;
    const messages = issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    return new AppError(`Validation failed: ${messages.join(', ')}`, 400);
  }
  return new AppError('Validation failed', 400);
}
