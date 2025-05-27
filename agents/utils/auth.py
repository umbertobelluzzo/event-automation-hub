# =============================================================================
# agents/utils/auth.py - Authentication and Authorization
# =============================================================================

import logging
from typing import Optional
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from utils.config import get_settings

logger = logging.getLogger(__name__)

security = HTTPBearer()
settings = get_settings()

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Verify API key for agent requests"""
    
    try:
        token = credentials.credentials
        
        # Simple API key verification
        if token == settings.agents_api_key:
            return token
        
        # Try JWT verification
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"]
            )
            return token
        except jwt.InvalidTokenError:
            pass
        
        # If neither worked, raise unauthorized
        raise HTTPException(
            status_code=401,
            detail="Invalid API key or token"
        )
        
    except Exception as e:
        logger.error(f"API key verification failed: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

def create_jwt_token(payload: dict) -> str:
    """Create JWT token"""
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None