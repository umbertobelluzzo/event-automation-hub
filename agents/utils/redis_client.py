# =============================================================================
# agents/utils/redis_client.py - Redis Client Configuration
# =============================================================================

import asyncio
import logging
from typing import Optional
import redis.asyncio as redis
from redis.asyncio import ConnectionPool

from utils.config import get_settings

logger = logging.getLogger(__name__)

class RedisClient:
    """Redis client wrapper with connection management"""
    
    def __init__(self):
        self.settings = get_settings()
        self.pool: Optional[ConnectionPool] = None
        self.client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize Redis connection pool"""
        try:
            # Create connection pool
            self.pool = ConnectionPool.from_url(
                self.settings.get_redis_url(),
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True
            )
            
            # Create Redis client
            self.client = redis.Redis(connection_pool=self.pool)
            
            # Test connection
            await self.client.ping()
            logger.info("✅ Redis client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            raise
    
    async def close(self):
        """Close Redis connections"""
        if self.client:
            await self.client.close()
        if self.pool:
            await self.pool.disconnect()
        logger.info("Redis client closed")
    
    def get_client(self) -> redis.Redis:
        """Get Redis client instance"""
        if not self.client:
            raise RuntimeError("Redis client not initialized")
        return self.client

# Global Redis client instance
_redis_client: Optional[RedisClient] = None

async def get_redis_client() -> redis.Redis:
    """Get global Redis client instance"""
    global _redis_client
    
    if _redis_client is None:
        _redis_client = RedisClient()
        await _redis_client.initialize()
    
    return _redis_client.get_client()

async def close_redis_client():
    """Close global Redis client"""
    global _redis_client
    
    if _redis_client:
        await _redis_client.close()
        _redis_client = None