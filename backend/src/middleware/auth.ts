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
 * Full authentication middleware for user-facing routes.
 * In a real production app, this would verify JWT tokens.
 * For now, it remains a development mock.
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
  
  logger.debug('Development user attached to request via authMiddleware');
  next();
};

/**
 * Simple API Key authentication middleware for machine-to-machine communication.
 * Used to protect webhook endpoints called by internal services (e.g., Python AI Agents).
 */
export const simpleAuthMiddleware = (
  req: Request, // Can be basic Request type if no user is attached
  res: Response,
  next: NextFunction
): void => {
  const apiKey = process.env.NODEJS_API_KEY;

  if (!apiKey) {
    logger.error('CRITICAL: NODEJS_API_KEY is not set in environment. Denying all M2M requests.');
    res.status(500).json({ success: false, message: 'Server configuration error' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('M2M request missing or malformed Authorization header');
    res.status(401).json({ success: false, message: 'Unauthorized: Missing API Key' });
    return;
  }

  const providedKey = authHeader.split(' ')[1];
  if (providedKey === apiKey) {
    logger.debug('M2M request authenticated successfully via API Key');
    next();
  } else {
    logger.warn('M2M request with invalid API Key');
    res.status(403).json({ success: false, message: 'Forbidden: Invalid API Key' });
  }
};