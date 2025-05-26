import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();
const logger = createLogger('auth-routes');

/**
 * GET /api/auth/me
 * Returns current user information
 */
router.get('/me', async (req, res) => {
  try {
    // This would typically use the auth middleware to get user info
    // For now, return a simple response
    res.json({
      success: true,
      message: 'Authentication endpoint available',
      endpoints: {
        me: '/api/auth/me',
        session: '/api/auth/session',
      },
    });
  } catch (error) {
    logger.error('Auth me route error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
});

/**
 * GET /api/auth/session
 * Returns session information (integrates with NextAuth)
 */
router.get('/session', async (req, res) => {
  try {
    // This endpoint can be used to validate sessions from the frontend
    res.json({
      success: true,
      message: 'Session endpoint available',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Auth session route error:', error);
    res.status(500).json({
      success: false,
      message: 'Session error',
    });
  }
});

export default router;