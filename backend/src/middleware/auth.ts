// backend/src/middleware/auth.ts - Ultra simple version with no external deps
import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');

// Extend Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
  };
  session?: any;
}

/**
 * Development-only auth middleware
 * In production, this would verify real JWT tokens
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // For development - always allow with mock user
  req.user = {
    id: 'dev-user-1',
    email: 'dev@uniteditalian.org',
    name: 'Development User',
    role: 'ADMIN',
    isActive: true,
  };
  
  logger.debug('Development user attached to request');
  next();
};

/**
 * Simple auth middleware for development/testing
 */
export const simpleAuthMiddleware = authMiddleware; // Same as above for now