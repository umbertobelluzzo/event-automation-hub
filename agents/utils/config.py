# =============================================================================
# agents/utils/config.py - Configuration Management
# =============================================================================

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Environment
    environment: str = Field(default="development", env="NODE_ENV")
    debug: bool = Field(default=True, env="DEBUG")
    
    # Server Settings
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    backend_port: int = Field(default=4000, env="BACKEND_PORT")
    agents_port: int = Field(default=8000, env="AGENTS_PORT")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # API URLs
    backend_url: str = Field(default="http://localhost:4000", env="BACKEND_URL")
    frontend_url: str = Field(default="http://localhost:3000", env="FRONTEND_URL")
    
    # Authentication & Security
    agents_api_key: str = Field(default="your-agents-api-key", env="AGENTS_API_KEY")
    jwt_secret: str = Field(default="your-jwt-secret", env="JWT_SECRET")
    nextauth_secret: str = Field(default="", env="NEXTAUTH_SECRET")
    nextauth_url: str = Field(default="http://localhost:3000", env="NEXTAUTH_URL")
    session_timeout: int = Field(default=7200, env="SESSION_TIMEOUT")
    
    # Google OAuth
    google_client_id: str = Field(default="", env="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", env="GOOGLE_CLIENT_SECRET")
    
    # Email Configuration
    email_server_host: str = Field(default="", env="EMAIL_SERVER_HOST")
    email_server_port: int = Field(default=587, env="EMAIL_SERVER_PORT")
    email_server_user: str = Field(default="", env="EMAIL_SERVER_USER")
    email_server_password: str = Field(default="", env="EMAIL_SERVER_PASSWORD")
    email_from: str = Field(default="", env="EMAIL_FROM")
    
    # OpenRouter LLM Configuration
    openrouter_api_key: str = Field(default="", env="OPENROUTER_API_KEY")
    openrouter_model: str = Field(default="openai/gpt-4o", env="OPENROUTER_MODEL")
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", env="OPENROUTER_BASE_URL")
    ai_agent_timeout: int = Field(default=300000, env="AI_AGENT_TIMEOUT")
    max_concurrent_workflows: int = Field(default=10, env="MAX_CONCURRENT_WORKFLOWS")
    
    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    redis_host: str = Field(default="localhost", env="REDIS_HOST")
    redis_port: int = Field(default=6379, env="REDIS_PORT")
    redis_db: int = Field(default=0, env="REDIS_DB")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    
    # Google Services Configuration
    google_service_account_json: str = Field(default="", env="GOOGLE_SERVICE_ACCOUNT_JSON")
    google_drive_parent_folder_id: str = Field(default="", env="GOOGLE_DRIVE_PARENT_FOLDER_ID")
    google_calendar_id: str = Field(default="primary", env="GOOGLE_CALENDAR_ID")
    google_credentials_path: str = Field(default="", env="GOOGLE_CREDENTIALS_PATH")
    google_service_account_path: str = Field(default="", env="GOOGLE_SERVICE_ACCOUNT_PATH")
    google_drive_folder_id: str = Field(default="", env="GOOGLE_DRIVE_FOLDER_ID")
    
    # External Service APIs
    canva_api_token: str = Field(default="", env="CANVA_API_TOKEN")
    canva_template_id: str = Field(default="", env="CANVA_TEMPLATE_ID")
    canva_brand_kit_id: str = Field(default="", env="CANVA_BRAND_KIT_ID")
    
    # ClickUp Configuration
    clickup_api_key: str = Field(default="", env="CLICKUP_API_KEY")
    clickup_api_token: str = Field(default="", env="CLICKUP_API_TOKEN")
    clickup_team_id: str = Field(default="", env="CLICKUP_TEAM_ID")
    clickup_space_id: str = Field(default="", env="CLICKUP_SPACE_ID")
    clickup_folder_id: str = Field(default="", env="CLICKUP_FOLDER_ID")
    clickup_list_id: str = Field(default="", env="CLICKUP_LIST_ID")
    
    # Rate Limiting & Security
    rate_limit_window_ms: int = Field(default=900000, env="RATE_LIMIT_WINDOW_MS")
    rate_limit_max_requests: int = Field(default=100, env="RATE_LIMIT_MAX_REQUESTS")
    api_key_rotation_enabled: bool = Field(default=False, env="API_KEY_ROTATION_ENABLED")
    
    # Logging & Monitoring
    log_file_path: str = Field(default="./storage/logs/app.log", env="LOG_FILE_PATH")
    enable_request_logging: bool = Field(default=True, env="ENABLE_REQUEST_LOGGING")
    
    # Development & Testing
    enable_mock_services: bool = Field(default=False, env="ENABLE_MOCK_SERVICES")
    test_database_url: str = Field(default="", env="TEST_DATABASE_URL")
    seed_database: bool = Field(default=True, env="SEED_DATABASE")
    
    # Database Configuration
    database_url: str = Field(default="postgresql://user:pass@localhost/uis_events", env="DATABASE_URL")
    
    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore"  # This allows extra fields in .env to be ignored
    }
    
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
    
    def get_redis_url(self) -> str:
        """Get complete Redis URL"""
        if self.redis_url and self.redis_url != "redis://localhost:6379":
            return self.redis_url
        
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

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
