# =============================================================================
# agents/main.py - FastAPI Server Entry Point
# =============================================================================

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn
from dotenv import load_dotenv

from orchestrator.workflow_orchestrator import WorkflowOrchestrator
from utils.config import get_settings
from utils.logger import setup_logger
from utils.redis_client import get_redis_client
from utils.auth import verify_api_key

# Load environment variables
load_dotenv(dotenv_path="../.env")

# Initialize logger
logger = setup_logger(__name__)

# Global orchestrator instance
orchestrator: Optional[WorkflowOrchestrator] = None

# =============================================================================
# Lifespan Context Manager
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global orchestrator
    
    # Startup
    logger.info("🚀 Starting UIS AI Agents System...")
    
    try:
        # Initialize workflow orchestrator
        orchestrator = WorkflowOrchestrator()
        await orchestrator.initialize()
        
        # Verify external service connections
        redis_client = await get_redis_client()
        await redis_client.ping()
        
        logger.info("✅ AI Agents System started successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to start AI Agents System: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Agents System...")
    
    if orchestrator:
        await orchestrator.cleanup()
    
    logger.info("✅ AI Agents System shutdown complete")

# =============================================================================
# FastAPI App Initialization
# =============================================================================

app = FastAPI(
    title="UIS Event-Automation Hub - AI Agents API",
    description="LangGraph-powered AI agents for event content generation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Request/Response Models
# =============================================================================

class WorkflowStartRequest(BaseModel):
    """Request model for starting a workflow"""
    session_id: str = Field(..., description="Unique session identifier")
    event_id: str = Field(..., description="Event ID from database")
    event_data: Dict[str, Any] = Field(..., description="Event details")
    content_preferences: Dict[str, Any] = Field(..., description="AI content preferences")
    user_info: Dict[str, Any] = Field(..., description="User information")

class WorkflowRegenerateRequest(BaseModel):
    """Request model for content regeneration"""
    session_id: str = Field(..., description="Unique session identifier")
    event_id: str = Field(..., description="Event ID from database")
    regeneration_type: str = Field(..., description="Type: flyer, social, whatsapp, all")
    content_preferences: Dict[str, Any] = Field(..., description="AI content preferences")

class WorkflowStatusResponse(BaseModel):
    """Response model for workflow status"""
    session_id: str
    status: str
    current_step: str
    completed_steps: list[str]
    failed_steps: list[str]
    progress_percentage: int
    estimated_time_remaining: Optional[int] = None
    error_message: Optional[str] = None
    generated_content: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str
    services: Dict[str, str]

# =============================================================================
# Health Check Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint"""
    services_status = {}
    
    try:
        # Check Redis connection
        redis_client = await get_redis_client()
        await redis_client.ping()
        services_status["redis"] = "healthy"
    except Exception:
        services_status["redis"] = "unhealthy"
    
    try:
        # Check orchestrator status
        if orchestrator and orchestrator.is_healthy():
            services_status["orchestrator"] = "healthy"
        else:
            services_status["orchestrator"] = "unhealthy"
    except Exception:
        services_status["orchestrator"] = "unhealthy"
    
    # Check OpenRouter API (basic)
    services_status["openrouter"] = "healthy" if os.getenv("OPENROUTER_API_KEY") else "not_configured"
    
    overall_status = "healthy" if all(s in ["healthy", "not_configured"] for s in services_status.values()) else "degraded"
    
    return HealthResponse(
        status=overall_status,
        timestamp=asyncio.get_event_loop().time(),
        version="1.0.0",
        services=services_status
    )

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with more information"""
    settings = get_settings()
    
    health_data = {
        "status": "healthy",
        "timestamp": asyncio.get_event_loop().time(),
        "version": "1.0.0",
        "environment": settings.environment,
        "services": {},
        "metrics": {}
    }
    
    # Service checks
    try:
        redis_client = await get_redis_client()
        redis_info = await redis_client.info()
        health_data["services"]["redis"] = {
            "status": "healthy",
            "version": redis_info.get("redis_version", "unknown"),
            "memory_usage": redis_info.get("used_memory_human", "unknown")
        }
    except Exception as e:
        health_data["services"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Orchestrator metrics
    if orchestrator:
        try:
            metrics = await orchestrator.get_health_metrics()
            health_data["services"]["orchestrator"] = {
                "status": "healthy",
                "active_workflows": metrics.get("active_workflows", 0),
                "completed_workflows": metrics.get("completed_workflows", 0),
                "failed_workflows": metrics.get("failed_workflows", 0)
            }
        except Exception as e:
            health_data["services"]["orchestrator"] = {
                "status": "unhealthy",
                "error": str(e)
            }
    
    return health_data

# =============================================================================
# Workflow Management Endpoints
# =============================================================================

@app.post("/workflow/start", response_model=WorkflowStatusResponse)
async def start_workflow(
    request: WorkflowStartRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """Start a new AI workflow for event content generation"""
    
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Workflow orchestrator not available"
        )
    
    try:
        logger.info(f"Starting workflow for session: {request.session_id}")
        
        # Start the workflow in background
        background_tasks.add_task(
            orchestrator.start_workflow,
            session_id=request.session_id,
            event_id=request.event_id,
            event_data=request.event_data,
            content_preferences=request.content_preferences,
            user_info=request.user_info
        )
        
        # Return initial status
        return WorkflowStatusResponse(
            session_id=request.session_id,
            status="in_progress",
            current_step="validate_input",
            completed_steps=[],
            failed_steps=[],
            progress_percentage=5,
            estimated_time_remaining=180
        )
        
    except Exception as e:
        logger.error(f"Failed to start workflow {request.session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workflow/regenerate", response_model=WorkflowStatusResponse)
async def regenerate_content(
    request: WorkflowRegenerateRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """Regenerate specific content for an event"""
    
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Workflow orchestrator not available"
        )
    
    try:
        logger.info(f"Starting content regeneration for session: {request.session_id}")
        
        # Start regeneration in background
        background_tasks.add_task(
            orchestrator.regenerate_content,
            session_id=request.session_id,
            event_id=request.event_id,
            regeneration_type=request.regeneration_type,
            content_preferences=request.content_preferences
        )
        
        return WorkflowStatusResponse(
            session_id=request.session_id,
            status="in_progress",
            current_step=f"regenerate_{request.regeneration_type}",
            completed_steps=[],
            failed_steps=[],
            progress_percentage=10,
            estimated_time_remaining=60
        )
        
    except Exception as e:
        logger.error(f"Failed to start regeneration {request.session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflow/{session_id}/status", response_model=WorkflowStatusResponse)
async def get_workflow_status(session_id: str):
    """Get current status of a workflow"""
    
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Workflow orchestrator not available"
        )
    
    try:
        status = await orchestrator.get_workflow_status(session_id)
        
        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow session {session_id} not found"
            )
        
        return WorkflowStatusResponse(**status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow status {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workflow/{session_id}/cancel")
async def cancel_workflow(session_id: str, api_key: str = Depends(verify_api_key)):
    """Cancel a running workflow"""
    
    if not orchestrator:
        raise HTTPException(
            status_code=503,
            detail="Workflow orchestrator not available"
        )
    
    try:
        success = await orchestrator.cancel_workflow(session_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Workflow session {session_id} not found or already completed"
            )
        
        return {"success": True, "message": f"Workflow {session_id} cancelled"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel workflow {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Webhook Endpoints for Backend Integration
# =============================================================================

@app.post("/webhook/workflow-update")
async def workflow_update_webhook(
    session_id: str,
    status: str,
    current_step: str,
    completed_steps: list[str] = [],
    failed_steps: list[str] = [],
    error_message: Optional[str] = None,
    generated_content: Optional[Dict[str, Any]] = None,
    api_key: str = Depends(verify_api_key)
):
    """Webhook to update workflow progress (called by agents)"""
    
    try:
        # Update workflow status in orchestrator
        if orchestrator:
            await orchestrator.update_workflow_progress(
                session_id=session_id,
                status=status,
                current_step=current_step,
                completed_steps=completed_steps,
                failed_steps=failed_steps,
                error_message=error_message,
                generated_content=generated_content
            )
        
        # Notify backend API about the update
        backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
        # TODO: Implement backend notification
        
        return {"success": True, "message": "Workflow updated"}
        
    except Exception as e:
        logger.error(f"Failed to process workflow update: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# Error Handlers
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc) if os.getenv("NODE_ENV") == "development" else "An error occurred"
        }
    )

# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    settings = get_settings()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
        access_log=True
    )