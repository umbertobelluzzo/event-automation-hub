# =============================================================================
# agents/service_agents/clickup_agent.py - ClickUp Integration Agent
# =============================================================================

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json
import aiohttp

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class ClickUpAgent:
    """Agent for ClickUp task and project management integration"""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.clickup_api_key
        self.team_id = self.settings.clickup_team_id
        self.space_id = self.settings.clickup_space_id
        self.folder_id = self.settings.clickup_folder_id
        self.session: Optional[aiohttp.ClientSession] = None
        self.base_url = "https://api.clickup.com/api/v2"
    
    async def initialize(self):
        """Initialize the ClickUp Agent"""
        logger.info("Initializing ClickUp Agent...")
        
        try:
            # Create HTTP session for ClickUp API calls
            self.session = aiohttp.ClientSession(
                headers={
                    'Authorization': self.api_key,
                    'Content-Type': 'application/json'
                },
                timeout=aiohttp.ClientTimeout(total=30)
            )
            
            # Test connection
            if await self._test_connection():
                logger.info("✅ ClickUp Agent initialized successfully")
            else:
                logger.warning("⚠️ ClickUp Agent initialized but connection test failed")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize ClickUp Agent: {e}")
            # Don't raise - allow system to continue without ClickUp integration
    
    async def _test_connection(self) -> bool:
        """Test ClickUp API connection"""
        
        if not self.session or not self.api_key:
            return False
        
        try:
            async with self.session.get(f"{self.base_url}/user") as response:
                if response.status == 200:
                    user_data = await response.json()
                    username = user_data.get('user', {}).get('username', 'Unknown')
                    logger.info(f"Connected to ClickUp as: {username}")
                    return True
                else:
                    logger.error(f"ClickUp connection test failed: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"ClickUp connection test failed: {e}")
            return False
    
    async def create_event_task(
        self,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create ClickUp task for event management"""
        
        logger.info(f"Creating ClickUp task for event: {event_data.get('title', 'Untitled')}")
        
        if not self.session or not self.api_key:
            logger.warning("ClickUp service not available")
            return {
                'error': 'ClickUp service not initialized',
                'fallback_task': self._generate_fallback_task(event_data, generated_content)
            }
        
        try:
            # Get or create project list
            list_id = await self._get_or_create_event_list()
            
            # Create main event task
            main_task = await self._create_main_task(list_id, event_data, generated_content, user_info)
            
            # Create subtasks for different aspects
            subtasks = await self._create_subtasks(main_task['id'], event_data, generated_content)
            
            # Create checklist items
            checklist_items = await self._create_task_checklist(main_task['id'], event_data)
            
            # Set task dependencies if needed
            await self._set_task_dependencies(main_task['id'], subtasks)
            
            # Add custom fields
            await self._add_custom_fields(main_task['id'], event_data, generated_content)
            
            result = {
                'task_id': main_task['id'],
                'task_url': main_task['url'],
                'task_name': main_task['name'],
                'list_id': list_id,
                'subtasks': subtasks,
                'checklist_items': checklist_items,
                'status': main_task.get('status', {}).get('status', 'to do'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ ClickUp task created successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ ClickUp task creation failed: {e}")
            return {
                'error': str(e),
                'fallback_task': self._generate_fallback_task(event_data, generated_content)
            }
    
    async def _get_or_create_event_list(self) -> str:
        """Get existing event list or create new one"""
        
        try:
            # First, try to find existing "Events" list
            if self.folder_id:
                async with self.session.get(f"{self.base_url}/folder/{self.folder_id}/list") as response:
                    if response.status == 200:
                        data = await response.json()
                        lists = data.get('lists', [])
                        
                        # Look for existing events list
                        for list_item in lists:
                            if 'event' in list_item.get('name', '').lower():
                                logger.info(f"Using existing ClickUp list: {list_item.get('name')}")
                                return list_item.get('id')
            
            # Create new events list if none exists
            return await self._create_events_list()
            
        except Exception as e:
            logger.error(f"Failed to get or create event list: {e}")
            # Try to use space directly if folder doesn't work
            if self.space_id:
                return await self._create_events_list_in_space()
            raise
    
    async def _create_events_list(self) -> str:
        """Create new events list in folder"""
        
        list_data = {
            'name': 'UIS Events Management',
            'content': 'Tasks for managing United Italian Societies events',
            'due_date_time': False,
            'priority': True,
            'assignee': True,
            'tag': True,
            'status': True,
            'checklists': True
        }
        
        try:
            endpoint = f"{self.base_url}/folder/{self.folder_id}/list" if self.folder_id else f"{self.base_url}/space/{self.space_id}/list"
            
            async with self.session.post(endpoint, json=list_data) as response:
                if response.status == 200:
                    data = await response.json()
                    list_id = data.get('id')
                    logger.info(f"✅ Created new ClickUp events list: {list_id}")
                    return list_id
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to create list: {response.status} - {error_text}")
                    
        except Exception as e:
            logger.error(f"Failed to create events list: {e}")
            raise
    
    async def _create_events_list_in_space(self) -> str:
        """Create events list directly in space"""
        
        list_data = {
            'name': 'UIS Events Management',
            'content': 'Tasks for managing United Italian Societies events'
        }
        
        try:
            async with self.session.post(f"{self.base_url}/space/{self.space_id}/list", json=list_data) as response:
                if response.status == 200:
                    data = await response.json()
                    list_id = data.get('id')
                    logger.info(f"✅ Created events list in space: {list_id}")
                    return list_id
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to create list in space: {response.status} - {error_text}")
                    
        except Exception as e:
            logger.error(f"Failed to create events list in space: {e}")
            raise
    
    async def _create_main_task(
        self,
        list_id: str,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create main event management task"""
        
        title = event_data.get('title', 'Untitled Event')
        description = self._build_task_description(event_data, generated_content)
        
        # Calculate due date (event date minus 1 day for final prep)
        due_date = self._calculate_task_due_date(event_data.get('start_date'))
        
        task_data = {
            'name': f"📅 {title} - Event Management",
            'description': description,
            'assignees': self._get_assignees(user_info),
            'tags': self._generate_task_tags(event_data),
            'status': 'to do',
            'priority': self._get_task_priority(event_data),
            'due_date': due_date,
            'start_date': self._get_task_start_date(event_data),
            'notify_all': True
        }
        
        try:
            async with self.session.post(f"{self.base_url}/list/{list_id}/task", json=task_data) as response:
                if response.status == 200:
                    data = await response.json()
                    task_id = data.get('id')
                    task_url = data.get('url')
                    logger.info(f"✅ Created main ClickUp task: {task_id}")
                    
                    return {
                        'id': task_id,
                        'url': task_url,
                        'name': task_data['name'],
                        'status': data.get('status', {})
                    }
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to create main task: {response.status} - {error_text}")
                    
        except Exception as e:
            logger.error(f"Failed to create main task: {e}")
            raise
    
    def _build_task_description(
        self,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> str:
        """Build comprehensive task description"""
        
        description_parts = [
            f"**Event: {event_data.get('title', 'Untitled Event')}**",
            "",
            "**Event Details:**",
            f"• Type: {event_data.get('event_type', 'TBD')}",
            f"• Date: {event_data.get('start_date', 'TBD')}",
            f"• Location: {self._format_location(event_data.get('location', {}))}",
            f"• Description: {event_data.get('description', 'No description provided')[:200]}...",
            "",
            "**Generated Content Status:**"
        ]
        
        # Add status of generated content
        if generated_content.get('flyer_url'):
            description_parts.append("✅ Event Flyer Created")
        else:
            description_parts.append("❌ Event Flyer Pending")
        
        if any(key in generated_content for key in ['instagram_caption', 'linkedin_caption', 'facebook_caption']):
            description_parts.append("✅ Social Media Content Created")
        else:
            description_parts.append("❌ Social Media Content Pending")
        
        if generated_content.get('whatsapp_message'):
            description_parts.append("✅ WhatsApp Message Created")
        else:
            description_parts.append("❌ WhatsApp Message Pending")
        
        if generated_content.get('google_calendar_id'):
            description_parts.append("✅ Calendar Event Created")
        else:
            description_parts.append("❌ Calendar Event Pending")
        
        description_parts.extend([
            "",
            "**Key Links:**"
        ])
        
        # Add relevant links
        if generated_content.get('flyer_url'):
            description_parts.append(f"• [Event Flyer]({generated_content['flyer_url']})")
        
        if generated_content.get('drive_folder_url'):
            description_parts.append(f"• [Google Drive Folder]({generated_content['drive_folder_url']})")
        
        if generated_content.get('google_calendar_url'):
            description_parts.append(f"• [Calendar Event]({generated_content['google_calendar_url']})")
        
        description_parts.extend([
            "",
            "**Next Steps:**",
            "1. Review all generated content",
            "2. Customize content as needed",
            "3. Launch promotional campaign",
            "4. Monitor registrations/RSVPs",
            "5. Prepare for event day",
            "",
            "---",
            "*Task created by UIS Event Automation Hub*"
        ])
        
        return "\n".join(description_parts)
    
    def _format_location(self, location: Dict[str, Any]) -> str:
        """Format location for task description"""
        
        if location.get('is_online'):
            return f"Online Event - {location.get('meeting_url', 'Meeting link TBD')}"
        else:
            name = location.get('name', '')
            address = location.get('address', '')
            if name and address:
                return f"{name}, {address}"
            elif name:
                return name
            elif address:
                return address
            else:
                return "Location TBD"
    
    def _calculate_task_due_date(self, event_date_str: Optional[str]) -> Optional[int]:
        """Calculate task due date (timestamp in milliseconds)"""
        
        if not event_date_str:
            return None
        
        try:
            # Parse event date
            event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
            
            # Set due date to 1 day before event for final preparations
            due_date = event_date - timedelta(days=1)
            
            # Convert to milliseconds timestamp
            return int(due_date.timestamp() * 1000)
            
        except Exception as e:
            logger.error(f"Failed to calculate task due date: {e}")
            return None
    
    def _get_task_start_date(self, event_data: Dict[str, Any]) -> Optional[int]:
        """Get task start date (now or specified start)"""
        
        # Start task immediately
        return int(datetime.now().timestamp() * 1000)
    
    def _get_assignees(self, user_info: Dict[str, Any]) -> List[int]:
        """Get assignee user IDs"""
        
        assignees = []
        
        # Try to get user ID from user info
        if user_info.get('clickup_user_id'):
            assignees.append(user_info['clickup_user_id'])
        
        # For now, return empty list - in production you'd map email to ClickUp user ID
        return assignees
    
    def _generate_task_tags(self, event_data: Dict[str, Any]) -> List[str]:
        """Generate tags for the task"""
        
        tags = ['event-management', 'uis-events']
        
        # Add event type tag
        event_type = event_data.get('event_type', '')
        if event_type:
            tags.append(f"event-{event_type}")
        
        # Add priority based tags
        if event_data.get('priority', '').lower() == 'high':
            tags.append('high-priority')
        
        # Add online/offline tag
        location = event_data.get('location', {})
        if location.get('is_online'):
            tags.append('online-event')
        else:
            tags.append('in-person-event')
        
        return tags
    
    def _get_task_priority(self, event_data: Dict[str, Any]) -> int:
        """Get task priority level"""
        
        # ClickUp priority levels: 1=Urgent, 2=High, 3=Normal, 4=Low
        priority_map = {
            'urgent': 1,
            'high': 2,
            'medium': 3,
            'normal': 3,
            'low': 4
        }
        
        event_priority = event_data.get('priority', 'normal').lower()
        return priority_map.get(event_priority, 3)
    
    async def _create_subtasks(
        self,
        parent_task_id: str,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create subtasks for different event aspects"""
        
        subtasks = []
        
        subtask_definitions = [
            {
                'name': '📝 Content Review & Approval',
                'description': 'Review all generated promotional content and approve for publication',
                'priority': 2,
                'due_offset_days': -5  # 5 days before event
            },
            {
                'name': '📢 Launch Promotional Campaign',
                'description': 'Post on social media, send WhatsApp messages, distribute flyers',
                'priority': 2,
                'due_offset_days': -4
            },
            {
                'name': '📊 Monitor Registration/RSVPs',
                'description': 'Track event registrations and follow up with invitees',
                'priority': 3,
                'due_offset_days': -3
            },
            {
                'name': '🛠️ Event Setup Preparation',
                'description': 'Prepare materials, confirm vendors, brief volunteers',
                'priority': 2,
                'due_offset_days': -2
            },
            {
                'name': '🎯 Day-of-Event Execution',
                'description': 'Execute event plan, manage logistics, document with photos',
                'priority': 1,
                'due_offset_days': 0
            },
            {
                'name': '📋 Post-Event Follow-up',
                'description': 'Send thank you messages, collect feedback, document outcomes',
                'priority': 3,
                'due_offset_days': 1
            }
        ]
        
        try:
            for subtask_def in subtask_definitions:
                subtask_data = {
                    'name': subtask_def['name'],
                    'description': subtask_def['description'],
                    'parent': parent_task_id,
                    'priority': subtask_def['priority'],
                    'due_date': self._calculate_subtask_due_date(
                        event_data.get('start_date'),
                        subtask_def['due_offset_days']
                    ),
                    'notify_all': True
                }
                
                # Create subtask (this would use the same list as parent)
                # For now, we'll store the definition to return
                subtasks.append({
                    'name': subtask_def['name'],
                    'description': subtask_def['description'],
                    'priority': subtask_def['priority'],
                    'due_offset_days': subtask_def['due_offset_days'],
                    'status': 'to do'
                })
            
            logger.info(f"✅ Prepared {len(subtasks)} subtasks")
            return subtasks
            
        except Exception as e:
            logger.error(f"Failed to create subtasks: {e}")
            return []
    
    def _calculate_subtask_due_date(self, event_date_str: Optional[str], offset_days: int) -> Optional[int]:
        """Calculate subtask due date with offset from event date"""
        
        if not event_date_str:
            return None
        
        try:
            event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
            due_date = event_date + timedelta(days=offset_days)
            return int(due_date.timestamp() * 1000)
            
        except Exception as e:
            logger.error(f"Failed to calculate subtask due date: {e}")
            return None
    
    async def _create_task_checklist(
        self,
        task_id: str,
        event_data: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Create checklist items for the task"""
        
        checklist_items = [
            "Review event flyer design and content",
            "Approve social media posts for all platforms",
            "Test WhatsApp broadcast message formatting",
            "Confirm event date, time, and location details",
            "Verify all contact information is current",
            "Check registration/RSVP system functionality",
            "Prepare event materials and supplies",
            "Confirm vendor bookings and deliveries",
            "Brief volunteers and assign roles",
            "Set up event space and test equipment",
            "Welcome attendees and manage check-in",
            "Document event with photos and videos",
            "Clean up event space",
            "Send thank you messages to attendees",
            "Collect and analyze attendee feedback",
            "Update contact database with new information",
            "Archive event materials and documentation"
        ]
        
        try:
            # In a real implementation, you'd create these via ClickUp API
            # For now, return the list for reference
            formatted_items = [
                {'name': item, 'completed': False}
                for item in checklist_items
            ]
            
            logger.info(f"✅ Prepared {len(formatted_items)} checklist items")
            return formatted_items
            
        except Exception as e:
            logger.error(f"Failed to create task checklist: {e}")
            return []
    
    async def _set_task_dependencies(
        self,
        main_task_id: str,
        subtasks: List[Dict[str, Any]]
    ):
        """Set task dependencies between subtasks"""
        
        try:
            # Define dependency chains
            # Content Review -> Promotional Campaign -> Monitor RSVPs -> Setup -> Execute -> Follow-up
            
            # For now, just log that dependencies should be set
            # In a real implementation, you'd use ClickUp's dependency API
            logger.info("✅ Task dependencies prepared (manual setup required)")
            
        except Exception as e:
            logger.error(f"Failed to set task dependencies: {e}")
    
    async def _add_custom_fields(
        self,
        task_id: str,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any]
    ):
        """Add custom fields to the task"""
        
        try:
            # Custom fields would include:
            # - Event Type
            # - Expected Attendees
            # - Budget
            # - Content Generation Status
            # - Promotion Status
            
            custom_fields = {
                'event_type': event_data.get('event_type', ''),
                'expected_attendees': event_data.get('expected_attendees', 0),
                'content_status': 'Generated' if generated_content else 'Pending',
                'promotion_status': 'Ready to Launch'
            }
            
            # For now, just log the custom fields
            # In a real implementation, you'd set these via ClickUp API
            logger.info(f"✅ Custom fields prepared: {list(custom_fields.keys())}")
            
        except Exception as e:
            logger.error(f"Failed to add custom fields: {e}")
    
    async def update_task_status(
        self,
        task_id: str,
        status: str,
        comment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update task status"""
        
        if not self.session:
            return {'error': 'ClickUp service not available'}
        
        try:
            update_data = {
                'status': status
            }
            
            async with self.session.put(f"{self.base_url}/task/{task_id}", json=update_data) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Add comment if provided
                    if comment:
                        await self._add_task_comment(task_id, comment)
                    
                    logger.info(f"✅ Updated task status to: {status}")
                    return {
                        'task_id': task_id,
                        'status': status,
                        'updated_at': datetime.utcnow().isoformat()
                    }
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to update task status: {response.status} - {error_text}")
                    
        except Exception as e:
            logger.error(f"Failed to update task status: {e}")
            return {'error': str(e)}
    
    async def _add_task_comment(self, task_id: str, comment: str):
        """Add comment to task"""
        
        try:
            comment_data = {
                'comment_text': comment,
                'notify_all': True
            }
            
            async with self.session.post(f"{self.base_url}/task/{task_id}/comment", json=comment_data) as response:
                if response.status == 200:
                    logger.info(f"✅ Added comment to task: {task_id}")
                else:
                    logger.warning(f"Failed to add comment to task: {response.status}")
                    
        except Exception as e:
            logger.error(f"Failed to add task comment: {e}")
    
    def _generate_fallback_task(
        self,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate fallback task structure when ClickUp API unavailable"""
        
        title = event_data.get('title', 'Event')
        
        return {
            'suggested_task': {
                'name': f"📅 {title} - Event Management",
                'description': f"Manage all aspects of {title} event",
                'priority': 'High',
                'due_date': 'Day before event',
                'tags': ['event-management', 'uis-events'],
                'assignee': 'Event organizer'
            },
            'suggested_subtasks': [
                {
                    'name': '📝 Content Review & Approval',
                    'due': '5 days before event'
                },
                {
                    'name': '📢 Launch Promotional Campaign',
                    'due': '4 days before event'
                },
                {
                    'name': '📊 Monitor Registration/RSVPs',
                    'due': '3 days before event'
                },
                {
                    'name': '🛠️ Event Setup Preparation',
                    'due': '2 days before event'
                },
                {
                    'name': '🎯 Day-of-Event Execution',
                    'due': 'Event day'
                },
                {
                    'name': '📋 Post-Event Follow-up',
                    'due': '1 day after event'
                }
            ],
            'checklist_items': [
                'Review all generated content',
                'Launch promotional campaign',
                'Monitor event registrations',
                'Prepare event materials',
                'Execute event plan',
                'Send follow-up communications'
            ],
            'manual_setup_instructions': [
                'Create main task in ClickUp manually',
                'Add subtasks for each phase of event management',
                'Set up checklist items for detailed tracking',
                'Assign appropriate team members',
                'Set due dates based on event timeline',
                'Add tags for easy filtering and organization'
            ],
            'clickup_url': 'https://clickup.com',
            'message': 'ClickUp API not available - create tasks manually'
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up ClickUp Agent...")
        
        if self.session and not self.session.closed:
            await self.session.close()
        
        logger.info("✅ ClickUp Agent cleanup completed")