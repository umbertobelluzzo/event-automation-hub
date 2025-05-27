import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');

// Extend Request interface properly
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
 * Simple JWT authentication middleware for API requests
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN_HERE

    if (!token) {
      logger.warn('Authentication failed: No token provided');
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    if (!decoded || !decoded.email) {
      logger.warn('Authentication failed: Invalid token structure');
      res.status(401).json({
        success: false,
        message: 'Invalid token format.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // For development, create a mock user based on token
    // In production, you'd fetch from database
    const user = {
      id: decoded.sub || 'user-' + Date.now(),
      email: decoded.email,
      name: decoded.name || 'User',
      role: decoded.role || 'USER',
      isActive: true,
    };

    // Attach user info to request
    req.user = user;

    logger.debug(`User authenticated: ${user.email} (${user.role})`);
    next();

  } catch (error) {
    logger.error('Authentication middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Simple auth middleware for development/testing
 * Allows requests without authentication
 */
export const simpleAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // For development - attach a mock user
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