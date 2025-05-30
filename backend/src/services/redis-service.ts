import * as Redis from 'redis';
import { createLogger } from '../utils/logger';
import type { WorkflowProgress } from '../types';

const logger = createLogger('redis-service');

// =============================================================================
// Redis Service Class
// =============================================================================

export class RedisService {
  private client: Redis.RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 20) {
            logger.error('Redis: Too many reconnection attempts, giving up');
            return new Error('Too many retries');
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    this.setupEventHandlers();
    this.connect();
  }

  // ===========================================================================
  // Connection Management  
  // ===========================================================================

  private setupEventHandlers() {
    this.client.on('connect', () => {
      logger.info('Redis: Connected to Redis server');
      this.connected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis: Ready to accept commands');
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
      this.connected = false;
    });

    this.client.on('end', () => {
      logger.warn('Redis: Connection ended');
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis: Reconnecting...');
    });
  }

  private async connect() {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }

  async disconnect() {
    try {
      await this.client.disconnect();
      this.connected = false;
      logger.info('Redis: Disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ===========================================================================
  // Workflow Progress Management
  // ===========================================================================

  /**
   * Stores workflow progress in Redis for real-time updates
   */
  async setWorkflowProgress(sessionId: string, progress: WorkflowProgress): Promise<void> {
    if (!this.connected) {
      logger.warn('Redis not connected, skipping workflow progress update');
      return;
    }

    try {
      const key = this.getWorkflowKey(sessionId);
      const value = JSON.stringify({
        ...progress,
        lastUpdated: new Date().toISOString(),
      });

      // Store with 24 hour expiration
      await this.client.setEx(key, 24 * 60 * 60, value);
      
      logger.debug(`Workflow progress stored: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to store workflow progress for ${sessionId}:`, error);
      // Don't throw - Redis failures shouldn't break the main flow
    }
  }

  /**
   * Retrieves workflow progress from Redis
   */
  async getWorkflowProgress(sessionId: string): Promise<WorkflowProgress | null> {
    if (!this.connected) {
      logger.warn('Redis not connected, cannot retrieve workflow progress');
      return null;
    }

    try {
      const key = this.getWorkflowKey(sessionId);
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      const progress = JSON.parse(value);
      delete progress.lastUpdated; // Remove internal field
      
      return progress as WorkflowProgress;
    } catch (error) {
      logger.error(`Failed to retrieve workflow progress for ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Removes workflow progress from Redis
   */
  async removeWorkflowProgress(sessionId: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const key = this.getWorkflowKey(sessionId);
      await this.client.del(key);
      
      logger.debug(`Workflow progress removed: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to remove workflow progress for ${sessionId}:`, error);
    }
  }

  // ===========================================================================
  // Session Management
  // ===========================================================================

  /**
   * Stores user session data
   */
  async setUserSession(userId: string, sessionData: any, ttlSeconds: number = 7200): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const key = this.getUserSessionKey(userId);
      const value = JSON.stringify({
        ...sessionData,
        createdAt: new Date().toISOString(),
      });

      await this.client.setEx(key, ttlSeconds, value);
      
      logger.debug(`User session stored: ${userId}`);
    } catch (error) {
      logger.error(`Failed to store user session for ${userId}:`, error);
    }
  }

  /**
   * Retrieves user session data
   */
  async getUserSession(userId: string): Promise<any | null> {
    if (!this.connected) {
      return null;
    }

    try {
      const key = this.getUserSessionKey(userId);
      const value = await this.client.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      logger.error(`Failed to retrieve user session for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Removes user session
   */
  async removeUserSession(userId: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const key = this.getUserSessionKey(userId);
      await this.client.del(key);
      
      logger.debug(`User session removed: ${userId}`);
    } catch (error) {
      logger.error(`Failed to remove user session for ${userId}:`, error);
    }
  }

  // ===========================================================================
  // Rate Limiting
  // ===========================================================================

  /**
   * Implements rate limiting using Redis
   */
  async checkRateLimit(
    identifier: string,
    windowSeconds: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    if (!this.connected) {
      // If Redis is down, allow the request but log the issue
      logger.warn('Redis not connected, bypassing rate limit check');
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(Date.now() + windowSeconds * 1000),
      };
    }

    try {
      const key = this.getRateLimitKey(identifier);
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - windowSeconds;

      // Use Redis sorted set to track requests in time window
      await this.client.zRemRangeByScore(key, 0, windowStart);
      
      const currentCount = await this.client.zCard(key);
      
      if (currentCount >= maxRequests) {
        const resetTime = new Date((now + windowSeconds) * 1000);
        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      // Add current request
      await this.client.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      await this.client.expire(key, windowSeconds + 1);

      const resetTime = new Date((now + windowSeconds) * 1000);
      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetTime,
      };
    } catch (error) {
      logger.error(`Rate limit check failed for ${identifier}:`, error);
      // On error, allow the request
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: new Date(Date.now() + windowSeconds * 1000),
      };
    }
  }

  // ===========================================================================
  // Caching
  // ===========================================================================

  /**
   * Generic cache set operation
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  /**
   * Generic cache get operation
   */
  async get(key: string): Promise<any | null> {
    if (!this.connected) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic cache delete operation
   */
  async del(key: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  // ===========================================================================
  // Pub/Sub for Real-time Updates
  // ===========================================================================

  /**
   * Publishes workflow updates for real-time notifications
   */
  async publishWorkflowUpdate(sessionId: string, update: WorkflowProgress): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const channel = `workflow:${sessionId}`;
      const message = JSON.stringify(update);
      
      await this.client.publish(channel, message);
      
      logger.debug(`Workflow update published: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to publish workflow update for ${sessionId}:`, error);
    }
  }

  /**
   * Subscribes to workflow updates
   */
  async subscribeToWorkflowUpdates(sessionId: string, callback: (update: WorkflowProgress) => void): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      const channel = `workflow:${sessionId}`;
      
      await subscriber.subscribe(channel, (message) => {
        try {
          const update = JSON.parse(message);
          callback(update);
        } catch (error) {
          logger.error(`Failed to parse workflow update message:`, error);
        }
      });
      
      logger.debug(`Subscribed to workflow updates: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to subscribe to workflow updates for ${sessionId}:`, error);
    }
  }

  // ===========================================================================
  // Key Generation Helpers
  // ===========================================================================

  private getWorkflowKey(sessionId: string): string {
    return `uis:workflow:${sessionId}`;
  }

  private getUserSessionKey(userId: string): string {
    return `uis:session:${userId}`;
  }

  private getRateLimitKey(identifier: string): string {
    return `uis:ratelimit:${identifier}`;
  }

  // ===========================================================================
  // Health Check & Maintenance
  // ===========================================================================

  /**
   * Performs Redis health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
    if (!this.connected) {
      return { status: 'unhealthy', error: 'Not connected' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return { status: 'healthy', latency };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Gets Redis server info
   */
  async getServerInfo(): Promise<any> {
    if (!this.connected) {
      return null;
    }

    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Failed to get Redis server info:', error);
      return null;
    }
  }

  /**
   * Cleans up expired keys (maintenance operation)
   */
  async cleanup(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      // Clean up old workflow progress keys
      const workflowKeys = await this.client.keys('uis:workflow:*');
      let cleanedCount = 0;

      for (const key of workflowKeys) {
        const ttl = await this.client.ttl(key);
        if (ttl === -1) { // Key exists but has no expiration
          await this.client.expire(key, 24 * 60 * 60); // Set 24 hour expiration
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Redis cleanup: Set expiration on ${cleanedCount} workflow keys`);
      }
    } catch (error) {
      logger.error('Redis cleanup failed:', error);
    }
  }
}