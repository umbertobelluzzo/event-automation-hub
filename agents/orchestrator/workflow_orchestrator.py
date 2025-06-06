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
import httpx

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
            
            # If StateGraph is typed with WorkflowState, we should be able to pass the object directly.
            # LangGraph will handle serializable fields if checkpointing is enabled with a compatible checkpointer.
            # For in-memory graphs or if state is always passed as a whole, object passing is fine.
            final_state = await self.workflow_graph.ainvoke(state)

            # The 'final_state' returned by ainvoke should ideally be the updated WorkflowState object.
            # However, the error suggests it might be a dict. Let's try accessing session_id as a key.
            current_session_id = final_state.get('session_id') if isinstance(final_state, dict) else final_state.session_id

            if not current_session_id:
                # If session_id is still not found, log an error and try to use the original state's session_id
                logger.error(f"Could not find session_id in final_state. Type: {type(final_state)}. Keys: {final_state.keys() if isinstance(final_state, dict) else 'N/A'}")
                current_session_id = state.session_id # Fallback to original state's session_id
            
            # Assuming final_state contains all fields of WorkflowState, even if it's a dict
            if isinstance(final_state, dict):
                # If it's a dict, we might need to reconstruct WorkflowState or update fields carefully.
                # For now, let's assume the structure matches and update the original state object with new values.
                # This is a simplification; ideally, we would reconstruct WorkflowState( **final_state)
                # if all keys match and values are of correct types.
                state.status = WorkflowStatus.COMPLETED 
                state.current_step = "completed"
                # Potentially update other fields in 'state' from 'final_state' dict if necessary
                updated_state_for_storage = state
            else:
                # If final_state is indeed a WorkflowState object as expected:
                final_state.status = WorkflowStatus.COMPLETED
                final_state.current_step = "completed"
                updated_state_for_storage = final_state
            
            await self._store_workflow_state(updated_state_for_storage)
            self.active_workflows[current_session_id] = updated_state_for_storage

            await self._notify_backend(updated_state_for_storage)
            logger.info(f"✅ Workflow completed: {current_session_id}")
            
        except Exception as e:
            logger.error(f"❌ Workflow failed: {state.session_id} - {e}", exc_info=True)
            state.status = WorkflowStatus.FAILED
            state.error_message = str(e)
            state.current_step = "error"
            await self._store_workflow_state(state)
            # self.active_workflows[state.session_id] = state # Already updated
            await self._notify_backend(state)
        finally:
            if state.session_id in self.active_workflows and \
               (state.status == WorkflowStatus.COMPLETED or state.status == WorkflowStatus.FAILED):
                logger.info(f"Removing workflow {state.session_id} from active list.")
                del self.active_workflows[state.session_id]
    
    async def _notify_backend(self, state: WorkflowState):
        """Notify the Node.js backend of workflow progress/completion/failure."""
        if not self.settings.backend_callback_url:
            logger.warning("BACKEND_CALLBACK_URL not configured. Skipping notification.")
            return

        payload = {
            "session_id": state.session_id,
            "status": state.status.value.upper(),  # Ensure uppercase status
            "current_step": state.current_step,
            "completed_steps": state.completed_steps,
            "failed_steps": state.failed_steps,
            # Only include error_message if it exists
            **({"error_message": state.error_message} if state.error_message else {}),
            "generated_content": state.generated_content,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.settings.nodejs_api_key}" # API key for Node.js backend
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.settings.backend_callback_url, 
                    json=payload, 
                    headers=headers,
                    timeout=15 # seconds
                )
                response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
                logger.info(f"Successfully notified backend for session {state.session_id}. Status: {response.status_code}")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error notifying backend for session {state.session_id}: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Request error notifying backend for session {state.session_id}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error notifying backend for session {state.session_id}: {e}", exc_info=True)

    # =============================================================================
    # Workflow Step Implementations
    # =============================================================================
    
    async def _validate_input(self, state: WorkflowState) -> WorkflowState:
        """Validate input data and prepare for processing"""
        logger.info(f"[{state.session_id}] Validating input...")
        state.current_step = "validate_input"
        
        try:
            # Validate required event_data fields
            required_event_fields = ['title', 'description', 'start_date'] # Add more as necessary
            missing_fields = [field for field in required_event_fields if not state.event_data.get(field)]
            if missing_fields:
                raise ValueError(f"Missing required event data fields: {', '.join(missing_fields)}")

            # Validate content_preferences (example)
            if not state.content_preferences or not isinstance(state.content_preferences, dict):
                 raise ValueError("Content preferences are missing or not a valid structure.")
            if not state.content_preferences.get('flyer_style'):
                logger.warning(f"[{state.session_id}] Flyer style not provided, defaulting to 'professional'.")
                state.content_preferences['flyer_style'] = 'professional' # Defaulting
            
            state.messages.append(AIMessage(content="Input validation completed successfully."))
            state.completed_steps.append("validate_input")
            logger.info(f"[{state.session_id}] ✅ Input validation successful.")
            # await self._store_workflow_state(state) # Storing state after each step can be verbose, consider frequency
            # await self._notify_backend(state) # Optional: notify backend of intermediate progress

        except ValueError as ve:
            logger.error(f"[{state.session_id}] ❌ Input validation failed: {ve}")
            state.failed_steps.append("validate_input")
            state.error_message = str(ve)
            # This will be caught by _execute_workflow's main try-except and handled
            raise  # Re-raise to stop the graph execution at this point for this branch
        
        return state
    
    async def _create_flyer(self, state: WorkflowState) -> WorkflowState:
        """Generate event flyer using Flyer Agent"""
        logger.info(f"[{state.session_id}] Creating flyer...")
        state.current_step = "create_flyer"

        try:
            flyer_result = await self.flyer_agent.generate_flyer(
                event_data=state.event_data,
                preferences=state.content_preferences,
                llm=self.llm # Pass the initialized LLM
            )

            if flyer_result.get('error'):
                logger.error(f"[{state.session_id}] ❌ FlyerAgent returned an error: {flyer_result['error']}")
                state.generated_content['flyer_error'] = flyer_result['error']
                # Decide if this is a critical failure for the step
                # For now, we log the error and let the workflow continue if possible, but mark step as failed.
                state.failed_steps.append("create_flyer")
                state.messages.append(AIMessage(content=f"Flyer creation encountered an issue: {flyer_result['error']}"))
            else:
                # Correctly extract new keys from flyer_agent response
                state.generated_content['flyer_url'] = flyer_result.get('flyer_url')
                state.generated_content['flyer_render_id'] = flyer_result.get('flyer_render_id')
                state.generated_content['flyer_template_id'] = flyer_result.get('flyer_template_id')
                state.generated_content['flyer_format'] = flyer_result.get('flyer_format')
                state.generated_content['design_notes'] = flyer_result.get('design_notes') # Key was already 'design_notes'
                
                logger.info(f"[{state.session_id}] ✅ Flyer created: {flyer_result.get('flyer_url')}")
                state.messages.append(AIMessage(content=f"Flyer created: {flyer_result.get('flyer_url')}"))
                state.completed_steps.append("create_flyer")
        
        except Exception as e:
            logger.error(f"[{state.session_id}] ❌ Exception during flyer creation: {e}", exc_info=True)
            state.failed_steps.append("create_flyer")
            state.error_message = state.error_message + f"; Flyer creation error: {str(e)}" if state.error_message else str(e)
            # This exception will be caught by _execute_workflow if not handled locally and re-raised.
            # For now, we log it and allow the workflow to proceed to demonstrate partial success if desired.
            # If flyer is critical, re-raise e here to stop workflow at this stage.

        # await self._store_workflow_state(state)
        # await self._notify_backend(state) # Optional: notify backend
        return state
    
    async def _create_social_content(self, state: WorkflowState) -> WorkflowState:
        logger.info(f"[{state.session_id}] Creating social media captions...")
        state.current_step = "create_social_content"

        flyer_url = state.generated_content.get('flyer_url')
        if not flyer_url:
            logger.warning(f"[{state.session_id}] Flyer URL not found in state. Skipping social media caption generation.")
            state.failed_steps.append("create_social_content")
            state.generated_content['social_media_error'] = "Flyer URL missing, cannot generate social media captions."
            state.messages.append(AIMessage(content="Social media captions skipped: Flyer URL not available."))
            return state

        try:
            captions_result = await self.social_media_agent.generate_content(
                event_data=state.event_data,
                preferences=state.content_preferences,
                flyer_url=flyer_url,
                llm=self.llm
            )

            # Update state with generated captions and any errors
            state.generated_content['instagram_caption'] = captions_result.get('instagram_caption')
            state.generated_content['linkedin_caption'] = captions_result.get('linkedin_caption')
            state.generated_content['twitter_caption'] = captions_result.get('twitter_caption')
            
            if captions_result.get('social_media_error'):
                logger.error(f"[{state.session_id}] ❌ SocialMediaAgent returned errors: {captions_result['social_media_error']}")
                state.generated_content['social_media_error'] = captions_result['social_media_error']
                state.failed_steps.append("create_social_content")
                state.messages.append(AIMessage(content=f"Social media caption generation encountered issues: {captions_result['social_media_error']}"))
            else:
                logger.info(f"[{state.session_id}] ✅ Social media captions generated successfully.")
                state.messages.append(AIMessage(content="Social media captions generated."))
                state.completed_steps.append("create_social_content")
        
        except Exception as e:
            logger.error(f"[{state.session_id}] ❌ Exception during social media caption generation: {e}", exc_info=True)
            state.failed_steps.append("create_social_content")
            error_msg = f"Social media caption generation error: {str(e)}"
            state.generated_content['social_media_error'] = error_msg
            state.error_message = state.error_message + f"; {error_msg}" if state.error_message else error_msg
            state.messages.append(AIMessage(content=error_msg))

        return state
    
    async def _create_whatsapp_message(self, state: WorkflowState) -> WorkflowState:
        logger.info(f"[{state.session_id}] Creating WhatsApp message...")
        state.current_step = "create_whatsapp_message"

        try:
            # The WhatsAppAgent's generate_message method now internally selects the template.
            message_result = await self.whatsapp_agent.generate_message(
                event_data=state.event_data,
                preferences=state.content_preferences, # For potential future tone/style hints
                llm=self.llm
            )

            if message_result.get('error'):
                logger.error(f"[{state.session_id}] ❌ WhatsAppAgent returned an error: {message_result['error']}")
                state.generated_content['whatsapp_message_error'] = message_result['error']
                state.failed_steps.append("create_whatsapp_message")
                state.messages.append(AIMessage(content=f"WhatsApp message creation encountered an issue: {message_result['error']}"))
            else:
                whatsapp_text = message_result.get('whatsapp_message_text')
                state.generated_content['whatsapp_message'] = whatsapp_text # Storing as 'whatsapp_message' for backend
                logger.info(f"[{state.session_id}] ✅ WhatsApp message generated: {whatsapp_text[:100]}...") # Log first 100 chars
                state.messages.append(AIMessage(content="WhatsApp message generated."))
                state.completed_steps.append("create_whatsapp_message")
        
        except Exception as e:
            logger.error(f"[{state.session_id}] ❌ Exception during WhatsApp message creation: {e}", exc_info=True)
            state.failed_steps.append("create_whatsapp_message")
            error_msg = f"WhatsApp message creation error: {str(e)}"
            state.generated_content['whatsapp_message_error'] = error_msg
            state.error_message = state.error_message + f"; {error_msg}" if state.error_message else error_msg
            state.messages.append(AIMessage(content=error_msg))
            
        return state
    
    async def _setup_google_drive(self, state: WorkflowState) -> WorkflowState:
        """Sets up Google Drive folder and uploads assets using the GoogleDriveAgent"""
        logger.info(f"[{state.session_id}] Setting up Google Drive...")
        state.current_step = "setup_google_drive"

        try:
            drive_result = await self.google_drive_agent.setup_event_folder(
                event_data=state.event_data,
                generated_content=state.generated_content
            )

            if drive_result.get('error'):
                logger.error(f"[{state.session_id}] ❌ GoogleDriveAgent returned an error: {drive_result['error']}")
                state.failed_steps.append("setup_google_drive")
                state.messages.append(AIMessage(content=f"Google Drive setup encountered an issue: {drive_result['error']}"))
            else:
                state.generated_content["google_drive_folder_id"] = drive_result.get("folder_id")
                state.generated_content["google_drive_folder_url"] = drive_result.get("folder_url")
                logger.info(f"[{state.session_id}] ✅ Google Drive setup successful. Folder URL: {drive_result.get('folder_url')}")
                state.completed_steps.append("setup_google_drive")
                state.messages.append(AIMessage(content="Google Drive folder and assets setup successfully."))

        except Exception as e:
            logger.error(f"[{state.session_id}] ❌ Exception during Google Drive setup: {e}", exc_info=True)
            state.failed_steps.append("setup_google_drive")
            error_msg = f"Google Drive setup error: {str(e)}"
            state.error_message = state.error_message + f"; {error_msg}" if state.error_message else error_msg
            state.messages.append(AIMessage(content=error_msg))

        return state
    
    async def _create_calendar_event(self, state: WorkflowState) -> WorkflowState:
        """Creates a Google Calendar event (placeholder)"""
        logger.info(f"[{state.session_id}] Creating calendar event (placeholder)..." )
        state.current_step = "create_calendar_event"
        state.completed_steps.append("create_calendar_event")
        return state
    
    async def _create_clickup_task(self, state: WorkflowState) -> WorkflowState:
        logger.info(f"[{state.session_id}] Creating ClickUp task (placeholder)..." )
        state.current_step = "create_clickup_task"
        state.completed_steps.append("create_clickup_task")
        return state
    
    async def _finalize_workflow(self, state: WorkflowState) -> WorkflowState:
        logger.info(f"[{state.session_id}] Finalizing workflow (placeholder)..." )
        state.current_step = "finalize_workflow"
        state.status = WorkflowStatus.COMPLETED # Set final status for graph's perspective
        state.completed_steps.append("finalize_workflow")
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
            await self._notify_backend(state)
            
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