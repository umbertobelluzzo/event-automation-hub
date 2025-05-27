# =============================================================================
# agents/orchestrator/workflow_orchestrator.py - Main LangGraph Orchestrator
# =============================================================================

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from enum import Enum

from langgraph.graph import StateGraph, END
# from langgraph.prebuilt import ToolExecutor
from langchain_openai import ChatOpenAI
from langchain.schema import BaseMessage, HumanMessage, AIMessage

from content_agents.flyer_agent import FlyerAgent
from content_agents.social_media_agent import SocialMediaAgent
from content_agents.whatsapp_agent import WhatsAppAgent
from service_agents.google_drive_agent import GoogleDriveAgent
from service_agents.google_calendar_agent import GoogleCalendarAgent
from service_agents.clickup_agent import ClickUpAgent
from utils.config import get_settings
from utils.logger import setup_logger
from utils.redis_client import get_redis_client

logger = setup_logger(__name__)

# =============================================================================
# Workflow State Management
# =============================================================================

class WorkflowStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    WAITING_APPROVAL = "waiting_approval"
    APPROVED = "approved"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class WorkflowState:
    """State object passed between workflow nodes"""
    session_id: str
    event_id: str
    status: WorkflowStatus
    current_step: str
    completed_steps: List[str]
    failed_steps: List[str]
    
    # Event data
    event_data: Dict[str, Any]
    content_preferences: Dict[str, Any]
    user_info: Dict[str, Any]
    
    # Generated content
    generated_content: Dict[str, Any]
    
    # Progress tracking
    start_time: datetime
    estimated_completion: Optional[datetime]
    error_message: Optional[str]
    
    # Messages for LLM context
    messages: List[BaseMessage]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "event_id": self.event_id,
            "status": self.status.value,
            "current_step": self.current_step,
            "completed_steps": self.completed_steps,
            "failed_steps": self.failed_steps,
            "event_data": self.event_data,
            "content_preferences": self.content_preferences,
            "user_info": self.user_info,
            "generated_content": self.generated_content,
            "start_time": self.start_time.isoformat(),
            "estimated_completion": self.estimated_completion.isoformat() if self.estimated_completion else None,
            "error_message": self.error_message,
            "progress_percentage": self.calculate_progress()
        }
    
    def calculate_progress(self) -> int:
        """Calculate progress percentage based on completed steps"""
        total_steps = 8  # Total workflow steps
        completed = len(self.completed_steps)
        return min(int((completed / total_steps) * 100), 100)

# =============================================================================
# Workflow Orchestrator
# =============================================================================

class WorkflowOrchestrator:
    """Main orchestrator for AI workflow using LangGraph"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis_client = None
        self.llm = None
        self.workflow_graph = None
        self.active_workflows: Dict[str, WorkflowState] = {}
        
        # Initialize agents
        self.flyer_agent = FlyerAgent()
        self.social_media_agent = SocialMediaAgent()
        self.whatsapp_agent = WhatsAppAgent()
        self.google_drive_agent = GoogleDriveAgent()
        self.google_calendar_agent = GoogleCalendarAgent()
        self.clickup_agent = ClickUpAgent()
    
    async def initialize(self):
        """Initialize the orchestrator and its components"""
        logger.info("Initializing Workflow Orchestrator...")
        
        # Initialize Redis client
        self.redis_client = await get_redis_client()
        
        # Initialize OpenRouter LLM
        self.llm = ChatOpenAI(
            model=self.settings.openrouter_model,
            api_key=self.settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.7,
            max_tokens=2000
        )
        
        # Initialize agents
        await self.flyer_agent.initialize()
        await self.social_media_agent.initialize()
        await self.whatsapp_agent.initialize()
        await self.google_drive_agent.initialize()
        await self.google_calendar_agent.initialize()
        await self.clickup_agent.initialize()
        
        # Build the workflow graph
        self._build_workflow_graph()
        
        logger.info("✅ Workflow Orchestrator initialized successfully")
    
    def _build_workflow_graph(self):
        """Build the LangGraph workflow"""
        logger.info("Building LangGraph workflow...")
        
        # Create the workflow graph
        workflow = StateGraph(WorkflowState)
        
        # Add nodes (workflow steps)
        workflow.add_node("validate_input", self._validate_input)
        workflow.add_node("create_flyer", self._create_flyer)
        workflow.add_node("create_social_content", self._create_social_content)
        workflow.add_node("create_whatsapp_message", self._create_whatsapp_message)
        workflow.add_node("setup_google_drive", self._setup_google_drive)
        workflow.add_node("create_calendar_event", self._create_calendar_event)
        workflow.add_node("create_clickup_task", self._create_clickup_task)
        workflow.add_node("finalize_workflow", self._finalize_workflow)
        
        # Define the workflow edges
        workflow.set_entry_point("validate_input")
        
        workflow.add_edge("validate_input", "create_flyer")
        workflow.add_edge("create_flyer", "create_social_content")
        workflow.add_edge("create_social_content", "create_whatsapp_message")
        workflow.add_edge("create_whatsapp_message", "setup_google_drive")
        workflow.add_edge("setup_google_drive", "create_calendar_event")
        workflow.add_edge("create_calendar_event", "create_clickup_task")
        workflow.add_edge("create_clickup_task", "finalize_workflow")
        workflow.add_edge("finalize_workflow", END)
        
        # Compile the graph
        self.workflow_graph = workflow.compile()
        
        logger.info("✅ LangGraph workflow built successfully")
    
    # =============================================================================
    # Workflow Execution Methods
    # =============================================================================
    
    async def start_workflow(
        self,
        session_id: str,
        event_id: str,
        event_data: Dict[str, Any],
        content_preferences: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> WorkflowState:
        """Start a new workflow"""
        
        logger.info(f"Starting workflow: {session_id}")
        
        # Create initial state
        state = WorkflowState(
            session_id=session_id,
            event_id=event_id,
            status=WorkflowStatus.IN_PROGRESS,
            current_step="validate_input",
            completed_steps=[],
            failed_steps=[],
            event_data=event_data,
            content_preferences=content_preferences,
            user_info=user_info,
            generated_content={},
            start_time=datetime.utcnow(),
            estimated_completion=datetime.utcnow() + timedelta(minutes=3),
            error_message=None,
            messages=[
                HumanMessage(content=f"Create promotional content for event: {event_data.get('title', 'Untitled Event')}")
            ]
        )
        
        # Store in active workflows
        self.active_workflows[session_id] = state
        
        # Store in Redis for persistence
        await self._store_workflow_state(state)
        
        # Execute workflow asynchronously
        asyncio.create_task(self._execute_workflow(state))
        
        return state
    
    async def _execute_workflow(self, state: WorkflowState):
        """Execute the complete workflow"""
        try:
            logger.info(f"Executing workflow: {state.session_id}")
            
            # Run the LangGraph workflow
            final_state = await self.workflow_graph.ainvoke(state)
            
            # Update final status
            final_state.status = WorkflowStatus.COMPLETED
            final_state.current_step = "completed"
            
            # Store final state
            await self._store_workflow_state(final_state)
            self.active_workflows[state.session_id] = final_state
            
            # Notify backend of completion
            await self._notify_backend_completion(final_state)
            
            logger.info(f"✅ Workflow completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Workflow failed: {state.session_id} - {e}")
            
            # Update failed status
            state.status = WorkflowStatus.FAILED
            state.error_message = str(e)
            state.failed_steps.append(state.current_step)
            
            await self._store_workflow_state(state)
            self.active_workflows[state.session_id] = state
            
            # Notify backend of failure
            await self._notify_backend_failure(state)
    
    # =============================================================================
    # Workflow Step Implementations
    # =============================================================================
    
    async def _validate_input(self, state: WorkflowState) -> WorkflowState:
        """Validate input data and prepare for processing"""
        logger.info(f"Validating input for workflow: {state.session_id}")
        
        state.current_step = "validate_input"
        
        try:
            # Validate required fields
            required_fields = ['title', 'description', 'start_date', 'location']
            missing_fields = [field for field in required_fields if not state.event_data.get(field)]
            
            if missing_fields:
                raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
            
            # Validate content preferences
            if not state.content_preferences.get('flyer_style'):
                state.content_preferences['flyer_style'] = 'professional'
            
            if not state.content_preferences.get('target_audience'):
                state.content_preferences['target_audience'] = ['general-public']
            
            # Add validation message to context
            state.messages.append(
                AIMessage(content="Input validation completed successfully. Event data is valid and ready for processing.")
            )
            
            state.completed_steps.append("validate_input")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ Input validation completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Input validation failed: {state.session_id} - {e}")
            state.failed_steps.append("validate_input")
            state.error_message = str(e)
            raise
        
        return state
    
    async def _create_flyer(self, state: WorkflowState) -> WorkflowState:
        """Generate event flyer using Canva API"""
        logger.info(f"Creating flyer for workflow: {state.session_id}")
        
        state.current_step = "create_flyer"
        
        try:
            # Generate flyer using Flyer Agent
            flyer_result = await self.flyer_agent.generate_flyer(
                event_data=state.event_data,
                preferences=state.content_preferences,
                llm=self.llm
            )
            
            # Store flyer data
            state.generated_content.update({
                'flyer_url': flyer_result.get('url'),
                'flyer_canva_id': flyer_result.get('canva_id'),
                'flyer_design_notes': flyer_result.get('design_notes')
            })
            
            # Add to LLM context
            state.messages.append(
                AIMessage(content=f"Flyer created successfully: {flyer_result.get('url', 'Generated')}")
            )
            
            state.completed_steps.append("create_flyer")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ Flyer creation completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Flyer creation failed: {state.session_id} - {e}")
            state.failed_steps.append("create_flyer")
            # Continue workflow even if flyer fails
            state.generated_content['flyer_error'] = str(e)
        
        return state
    
    async def _create_social_content(self, state: WorkflowState) -> WorkflowState:
        """Generate social media content"""
        logger.info(f"Creating social media content for workflow: {state.session_id}")
        
        state.current_step = "create_social_content"
        
        try:
            # Generate social media content
            social_result = await self.social_media_agent.generate_content(
                event_data=state.event_data,
                preferences=state.content_preferences,
                llm=self.llm
            )
            
            # Store social media content
            state.generated_content.update({
                'instagram_caption': social_result.get('instagram'),
                'linkedin_caption': social_result.get('linkedin'),
                'twitter_caption': social_result.get('twitter'),
                'facebook_caption': social_result.get('facebook')
            })
            
            # Add to LLM context
            state.messages.append(
                AIMessage(content=f"Social media content generated for {len(social_result)} platforms")
            )
            
            state.completed_steps.append("create_social_content")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ Social media content creation completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Social media content creation failed: {state.session_id} - {e}")
            state.failed_steps.append("create_social_content")
            state.generated_content['social_error'] = str(e)
        
        return state
    
    async def _create_whatsapp_message(self, state: WorkflowState) -> WorkflowState:
        """Generate WhatsApp broadcast message"""
        logger.info(f"Creating WhatsApp message for workflow: {state.session_id}")
        
        state.current_step = "create_whatsapp_message"
        
        try:
            # Generate WhatsApp message
            whatsapp_result = await self.whatsapp_agent.generate_message(
                event_data=state.event_data,
                preferences=state.content_preferences,
                llm=self.llm
            )
            
            # Store WhatsApp content
            state.generated_content.update({
                'whatsapp_message': whatsapp_result.get('message'),
                'whatsapp_broadcast_list': whatsapp_result.get('broadcast_suggestions')
            })
            
            state.completed_steps.append("create_whatsapp_message")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ WhatsApp message creation completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ WhatsApp message creation failed: {state.session_id} - {e}")
            state.failed_steps.append("create_whatsapp_message")
            state.generated_content['whatsapp_error'] = str(e)
        
        return state
    
    async def _setup_google_drive(self, state: WorkflowState) -> WorkflowState:
        """Create Google Drive folder and organize files"""
        logger.info(f"Setting up Google Drive for workflow: {state.session_id}")
        
        state.current_step = "setup_google_drive"
        
        try:
            # Create Drive folder and organize files
            drive_result = await self.google_drive_agent.setup_event_folder(
                event_data=state.event_data,
                generated_content=state.generated_content
            )
            
            # Store Drive information
            state.generated_content.update({
                'drive_folder_id': drive_result.get('folder_id'),
                'drive_folder_url': drive_result.get('folder_url'),
                'drive_files': drive_result.get('files', [])
            })
            
            state.completed_steps.append("setup_google_drive")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ Google Drive setup completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Google Drive setup failed: {state.session_id} - {e}")
            state.failed_steps.append("setup_google_drive")
            state.generated_content['drive_error'] = str(e)
        
        return state
    
    async def _create_calendar_event(self, state: WorkflowState) -> WorkflowState:
        """Create Google Calendar event"""
        logger.info(f"Creating calendar event for workflow: {state.session_id}")
        
        state.current_step = "create_calendar_event"
        
        try:
            # Create calendar event
            calendar_result = await self.google_calendar_agent.create_event(
                event_data=state.event_data,
                user_info=state.user_info
            )
            
            # Store calendar information
            state.generated_content.update({
                'google_calendar_id': calendar_result.get('event_id'),
                'google_calendar_url': calendar_result.get('event_url'),
                'calendar_invite_sent': calendar_result.get('invite_sent', False)
            })
            
            state.completed_steps.append("create_calendar_event")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ Calendar event creation completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Calendar event creation failed: {state.session_id} - {e}")
            state.failed_steps.append("create_calendar_event")
            state.generated_content['calendar_error'] = str(e)
        
        return state
    
    async def _create_clickup_task(self, state: WorkflowState) -> WorkflowState:
        """Create ClickUp task and checklist"""
        logger.info(f"Creating ClickUp task for workflow: {state.session_id}")
        
        state.current_step = "create_clickup_task"
        
        try:
            # Create ClickUp task
            clickup_result = await self.clickup_agent.create_event_task(
                event_data=state.event_data,
                generated_content=state.generated_content,
                user_info=state.user_info
            )
            
            # Store ClickUp information
            state.generated_content.update({
                'clickup_task_id': clickup_result.get('task_id'),
                'clickup_task_url': clickup_result.get('task_url'),
                'clickup_checklist_items': clickup_result.get('checklist_items', [])
            })
            
            state.completed_steps.append("create_clickup_task")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ ClickUp task creation completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ ClickUp task creation failed: {state.session_id} - {e}")
            state.failed_steps.append("create_clickup_task")
            state.generated_content['clickup_error'] = str(e)
        
        return state
    
    async def _finalize_workflow(self, state: WorkflowState) -> WorkflowState:
        """Finalize workflow and prepare summary"""
        logger.info(f"Finalizing workflow: {state.session_id}")
        
        state.current_step = "finalize_workflow"
        
        try:
            # Generate workflow summary
            summary = {
                'total_steps': len(state.completed_steps) + len(state.failed_steps),
                'completed_steps': len(state.completed_steps),
                'failed_steps': len(state.failed_steps),
                'success_rate': len(state.completed_steps) / (len(state.completed_steps) + len(state.failed_steps)) * 100,
                'generated_assets': []
            }
            
            # List generated assets
            if state.generated_content.get('flyer_url'):
                summary['generated_assets'].append('Event Flyer')
            if state.generated_content.get('instagram_caption'):
                summary['generated_assets'].append('Social Media Content')
            if state.generated_content.get('whatsapp_message'):
                summary['generated_assets'].append('WhatsApp Message')
            if state.generated_content.get('drive_folder_url'):
                summary['generated_assets'].append('Google Drive Folder')
            if state.generated_content.get('google_calendar_id'):
                summary['generated_assets'].append('Calendar Event')
            if state.generated_content.get('clickup_task_id'):
                summary['generated_assets'].append('ClickUp Task')
            
            state.generated_content['workflow_summary'] = summary
            
            # Add final message to context
            state.messages.append(
                AIMessage(content=f"Workflow completed successfully! Generated {len(summary['generated_assets'])} assets with {summary['success_rate']:.1f}% success rate.")
            )
            
            state.completed_steps.append("finalize_workflow")
            await self._store_workflow_state(state)
            
            logger.info(f"✅ Workflow finalization completed: {state.session_id}")
            
        except Exception as e:
            logger.error(f"❌ Workflow finalization failed: {state.session_id} - {e}")
            state.failed_steps.append("finalize_workflow")
            state.error_message = str(e)
        
        return state
    
    # =============================================================================
    # Regeneration Methods
    # =============================================================================
    
    async def regenerate_content(
        self,
        session_id: str,
        event_id: str,
        regeneration_type: str,
        content_preferences: Dict[str, Any]
    ):
        """Regenerate specific content type"""
        logger.info(f"Regenerating {regeneration_type} for session: {session_id}")
        
        # Get existing workflow state
        state = await self._get_workflow_state(session_id)
        if not state:
            raise ValueError(f"Workflow session {session_id} not found")
        
        # Update preferences
        state.content_preferences.update(content_preferences)
        state.status = WorkflowStatus.IN_PROGRESS
        
        try:
            if regeneration_type == "flyer" or regeneration_type == "all":
                await self._create_flyer(state)
            
            if regeneration_type == "social" or regeneration_type == "all":
                await self._create_social_content(state)
            
            if regeneration_type == "whatsapp" or regeneration_type == "all":
                await self._create_whatsapp_message(state)
            
            # Update status
            state.status = WorkflowStatus.COMPLETED
            state.current_step = f"regenerated_{regeneration_type}"
            
            # Store updated state
            await self._store_workflow_state(state)
            self.active_workflows[session_id] = state
            
            # Notify backend
            await self._notify_backend_completion(state)
            
            logger.info(f"✅ Content regeneration completed: {session_id}")
            
        except Exception as e:
            logger.error(f"❌ Content regeneration failed: {session_id} - {e}")
            state.status = WorkflowStatus.FAILED
            state.error_message = str(e)
            await self._store_workflow_state(state)
    
    # =============================================================================
    # State Management Methods
    # =============================================================================
    
    async def _store_workflow_state(self, state: WorkflowState):
        """Store workflow state in Redis"""
        try:
            key = f"uis:workflow:{state.session_id}"
            value = json.dumps(state.to_dict(), default=str)
            await self.redis_client.setex(key, 86400, value)  # 24 hour expiry
        except Exception as e:
            logger.error(f"Failed to store workflow state: {e}")
    
    async def _get_workflow_state(self, session_id: str) -> Optional[WorkflowState]:
        """Retrieve workflow state from Redis or memory"""
        try:
            # Try memory first
            if session_id in self.active_workflows:
                return self.active_workflows[session_id]
            
            # Try Redis
            key = f"uis:workflow:{session_id}"
            value = await self.redis_client.get(key)
            if value:
                data = json.loads(value)
                # Reconstruct state object (simplified version)
                return WorkflowState(
                    session_id=data['session_id'],
                    event_id=data['event_id'],
                    status=WorkflowStatus(data['status']),
                    current_step=data['current_step'],
                    completed_steps=data['completed_steps'],
                    failed_steps=data['failed_steps'],
                    event_data=data['event_data'],
                    content_preferences=data['content_preferences'],
                    user_info=data['user_info'],
                    generated_content=data['generated_content'],
                    start_time=datetime.fromisoformat(data['start_time']),
                    estimated_completion=datetime.fromisoformat(data['estimated_completion']) if data['estimated_completion'] else None,
                    error_message=data.get('error_message'),
                    messages=[]  # Simplified - messages not persisted
                )
            
            return None
        except Exception as e:
            logger.error(f"Failed to get workflow state: {e}")
            return None
    
    async def get_workflow_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get current workflow status"""
        state = await self._get_workflow_state(session_id)
        if state:
            return state.to_dict()
        return None
    
    async def cancel_workflow(self, session_id: str) -> bool:
        """Cancel a running workflow"""
        try:
            state = await self._get_workflow_state(session_id)
            if state and state.status == WorkflowStatus.IN_PROGRESS:
                state.status = WorkflowStatus.CANCELLED
                state.current_step = "cancelled"
                await self._store_workflow_state(state)
                
                if session_id in self.active_workflows:
                    del self.active_workflows[session_id]
                
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to cancel workflow: {e}")
            return False
    
    async def update_workflow_progress(
        self,
        session_id: str,
        status: str,
        current_step: str,
        completed_steps: List[str] = None,
        failed_steps: List[str] = None,
        error_message: Optional[str] = None,
        generated_content: Optional[Dict[str, Any]] = None
    ):
        """Update workflow progress (called by webhook)"""
        try:
            state = await self._get_workflow_state(session_id)
            if state:
                state.status = WorkflowStatus(status)
                state.current_step = current_step
                if completed_steps:
                    state.completed_steps = completed_steps
                if failed_steps:
                    state.failed_steps = failed_steps
                if error_message:
                    state.error_message = error_message
                if generated_content:
                    state.generated_content.update(generated_content)
                
                await self._store_workflow_state(state)
                self.active_workflows[session_id] = state
        except Exception as e:
            logger.error(f"Failed to update workflow progress: {e}")
    
    # =============================================================================
    # Backend Integration Methods
    # =============================================================================
    
    async def _notify_backend_completion(self, state: WorkflowState):
        """Notify backend API of workflow completion"""
        try:
            import aiohttp
            
            backend_url = self.settings.backend_url
            if not backend_url:
                logger.warning("Backend URL not configured, skipping notification")
                return
            
            payload = {
                'session_id': state.session_id,
                'event_id': state.event_id,
                'status': 'COMPLETED',
                'generated_content': state.generated_content
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{backend_url}/api/events/{state.event_id}/workflow-complete",
                    json=payload,
                    headers={'Authorization': f'Bearer {self.settings.agents_api_key}'}
                ) as response:
                    if response.status == 200:
                        logger.info(f"✅ Backend notified of completion: {state.session_id}")
                    else:
                        logger.error(f"❌ Backend notification failed: {response.status}")
        
        except Exception as e:
            logger.error(f"Failed to notify backend of completion: {e}")
    
    async def _notify_backend_failure(self, state: WorkflowState):
        """Notify backend API of workflow failure"""
        try:
            import aiohttp
            
            backend_url = self.settings.backend_url
            if not backend_url:
                logger.warning("Backend URL not configured, skipping notification")
                return
            
            payload = {
                'session_id': state.session_id,
                'event_id': state.event_id,
                'status': 'FAILED',
                'error_message': state.error_message,
                'failed_steps': state.failed_steps
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{backend_url}/api/events/{state.event_id}/workflow-failed",
                    json=payload,
                    headers={'Authorization': f'Bearer {self.settings.agents_api_key}'}
                ) as response:
                    if response.status == 200:
                        logger.info(f"✅ Backend notified of failure: {state.session_id}")
                    else:
                        logger.error(f"❌ Backend notification failed: {response.status}")
        
        except Exception as e:
            logger.error(f"Failed to notify backend of failure: {e}")
    
    # =============================================================================
    # Utility Methods
    # =============================================================================
    
    def is_healthy(self) -> bool:
        """Check if orchestrator is healthy"""
        return (
            self.redis_client is not None and
            self.llm is not None and
            self.workflow_graph is not None
        )
    
    async def get_health_metrics(self) -> Dict[str, Any]:
        """Get health metrics for monitoring"""
        return {
            'active_workflows': len(self.active_workflows),
            'completed_workflows': len([w for w in self.active_workflows.values() if w.status == WorkflowStatus.COMPLETED]),
            'failed_workflows': len([w for w in self.active_workflows.values() if w.status == WorkflowStatus.FAILED]),
            'redis_connected': self.redis_client is not None,
            'llm_initialized': self.llm is not None,
            'graph_compiled': self.workflow_graph is not None
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Workflow Orchestrator...")
        
        # Cancel all active workflows
        for session_id in list(self.active_workflows.keys()):
            await self.cancel_workflow(session_id)
        
        # Cleanup agents
        if hasattr(self.flyer_agent, 'cleanup'):
            await self.flyer_agent.cleanup()
        if hasattr(self.social_media_agent, 'cleanup'):
            await self.social_media_agent.cleanup()
        if hasattr(self.whatsapp_agent, 'cleanup'):
            await self.whatsapp_agent.cleanup()
        if hasattr(self.google_drive_agent, 'cleanup'):
            await self.google_drive_agent.cleanup()
        if hasattr(self.google_calendar_agent, 'cleanup'):
            await self.google_calendar_agent.cleanup()
        if hasattr(self.clickup_agent, 'cleanup'):
            await self.clickup_agent.cleanup()
        
        logger.info("✅ Workflow Orchestrator cleanup completed")