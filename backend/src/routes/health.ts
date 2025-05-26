import express from 'express';
import { PrismaClient } from '@prisma/client';
import { RedisService } from '../services/redis-service';

const router = express.Router();
const prisma = new PrismaClient();
const redis = new RedisService();

/**
 * GET /api/health
 * Basic health check
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req, res) => {
  const checks = {
    server: { status: 'healthy' },
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    agents: { status: 'unknown' },
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Check Redis
  try {
    const redisHealth = await redis.healthCheck();
    checks.redis = redisHealth;
  } catch (error) {
    checks.redis = { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  // Check AI Agents
  try {
    const agentsUrl = process.env.AGENTS_URL || 'http://localhost:8000';
    const response = await fetch(`${agentsUrl}/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    checks.agents = { 
      status: response.ok ? 'healthy' : 'unhealthy',
      statusCode: response.status,
    };
  } catch (error) {
    checks.agents = { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }

  const overallHealthy = Object.values(checks).every(check => check.status === 'healthy');

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;