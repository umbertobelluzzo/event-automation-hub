# =============================================================================
# agents/utils/config.py - Configuration Management
# =============================================================================

import os
from typing import Optional
from pydantic import BaseSettings, Field
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Environment
    environment: str = Field(default="development", env="NODE_ENV")
    debug: bool = Field(default=True, env="DEBUG")
    
    # Server Settings
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # API URLs
    backend_url: str = Field(default="http://localhost:4000", env="BACKEND_URL")
    frontend_url: str = Field(default="http://localhost:3000", env="FRONTEND_URL")
    
    # Authentication & Security
    agents_api_key: str = Field(default="your-agents-api-key", env="AGENTS_API_KEY")
    jwt_secret: str = Field(default="your-jwt-secret", env="JWT_SECRET")
    
    # OpenRouter LLM Configuration
    openrouter_api_key: str = Field(default="", env="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="openai/gpt-4", env="OPENROUTER_MODEL")
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", env="OPENROUTER_BASE_URL")
    
    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_host: str = Field(default="localhost", env="REDIS_HOST")
    redis_port: int = Field(default=6379, env="REDIS_PORT")
    redis_db: int = Field(default=0, env="REDIS_DB")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # Canva API Configuration
    canva_api_token: str = Field(default="", env="CANVA_API_TOKEN")
    canva_template_id: str = Field(default="", env="CANVA_TEMPLATE_ID")
    canva_brand_kit_id: str = Field(default="", env="CANVA_BRAND_KIT_ID")
    
    # Google APIs Configuration
    google_credentials_path: str = Field(default="", env="GOOGLE_CREDENTIALS_PATH")
    google_service_account_path: str = Field(default="", env="GOOGLE_SERVICE_ACCOUNT_PATH")
    google_drive_folder_id: str = Field(default="", env="GOOGLE_DRIVE_FOLDER_ID")
    
    # ClickUp Configuration
    clickup_api_key: str = Field(default="", env="CLICKUP_API_KEY")
    clickup_team_id: str = Field(default="", env="CLICKUP_TEAM_ID")
    clickup_space_id: str = Field(default="", env="CLICKUP_SPACE_ID")
    clickup_folder_id: str = Field(default="", env="CLICKUP_FOLDER_ID")
    
    # Database Configuration (for future use)
    database_url: str = Field(default="postgresql://user:pass@localhost/uis_events", env="DATABASE_URL")
    
    # File Storage
    upload_path: str = Field(default="./uploads", env="UPLOAD_PATH")
    max_file_size: int = Field(default=10485760, env="MAX_FILE_SIZE")  # 10MB
    
    # Logging
    log_file_path: str = Field(default="./logs/agents.log", env="LOG_FILE_PATH")
    log_max_bytes: int = Field(default=10485760, env="LOG_MAX_BYTES")  # 10MB
    log_backup_count: int = Field(default=5, env="LOG_BACKUP_COUNT")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # seconds
    
    # Workflow Configuration
    workflow_timeout: int = Field(default=300, env="WORKFLOW_TIMEOUT")  # 5 minutes
    max_concurrent_workflows: int = Field(default=10, env="MAX_CONCURRENT_WORKFLOWS")
    workflow_retry_attempts: int = Field(default=3, env="WORKFLOW_RETRY_ATTEMPTS")
    
    # Email Configuration (for notifications)
    smtp_host: str = Field(default="", env="SMTP_HOST")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: str = Field(default="", env="SMTP_USERNAME")
    smtp_password: str = Field(default="", env="SMTP_PASSWORD")
    smtp_use_tls: bool = Field(default=True, env="SMTP_USE_TLS")
    
    # Webhook Configuration
    webhook_secret: str = Field(default="your-webhook-secret", env="WEBHOOK_SECRET")
    webhook_timeout: int = Field(default=30, env="WEBHOOK_TIMEOUT")
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = False
    
    def validate_required_settings(self) -> list[str]:
        """Validate that required settings are present"""
        missing = []
        
        if not self.openrouter_api_key:
            missing.append("OPENROUTER_API_KEY")
        
        if not self.agents_api_key or self.agents_api_key == "your-agents-api-key":
            missing.append("AGENTS_API_KEY")
        
        if not self.jwt_secret or self.jwt_secret == "your-jwt-secret":
            missing.append("JWT_SECRET")
        
        return missing
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.environment.lower() == "development"
    
    def get_redis_url(self) -> str:
        """Get complete Redis URL"""
        if self.redis_url and self.redis_url != "redis://localhost:6379":
            return self.redis_url
        
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    def get_log_config(self) -> dict:
        """Get logging configuration"""
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                },
                "detailed": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
                    "datefmt": "%Y-%m-%d %H:%M:%S"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": self.log_level,
                    "formatter": "default",
                    "stream": "ext://sys.stdout"
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": self.log_level,
                    "formatter": "detailed",
                    "filename": self.log_file_path,
                    "maxBytes": self.log_max_bytes,
                    "backupCount": self.log_backup_count,
                    "encoding": "utf-8"
                }
            },
            "loggers": {
                "": {  # Root logger
                    "level": self.log_level,
                    "handlers": ["console", "file"],
                    "propagate": False
                },
                "uvicorn": {
                    "level": "INFO",
                    "handlers": ["console"],
                    "propagate": False
                },
                "uvicorn.access": {
                    "level": "INFO",
                    "handlers": ["console"],
                    "propagate": False
                }
            }
        }
    
    def get_cors_origins(self) -> list[str]:
        """Get CORS allowed origins"""
        origins = [
            self.frontend_url,
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001"
        ]
        
        # Add production URLs if available
        if self.is_production():
            # Add your production domains here
            origins.extend([
                "https://uis-events.com",
                "https://events.uniteditalian.org"
            ])
        
        return origins
    
    def get_openrouter_config(self) -> dict:
        """Get OpenRouter LLM configuration"""
        return {
            "api_key": self.openrouter_api_key,
            "base_url": self.openrouter_base_url,
            "model": self.openrouter_model,
            "temperature": 0.7,
            "max_tokens": 2000,
            "timeout": 60
        }

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

def validate_environment():
    """Validate environment configuration"""
    settings = get_settings()
    missing = settings.validate_required_settings()
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    return settings