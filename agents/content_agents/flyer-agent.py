# =============================================================================
# agents/content_agents/flyer_agent.py - Canva Flyer Generation Agent
# =============================================================================

import asyncio
import logging
from typing import Dict, Any, Optional
import aiohttp
import base64
from datetime import datetime

from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class FlyerAgent:
    """Agent for generating event flyers using Canva API and AI"""
    
    def __init__(self):
        self.settings = get_settings()
        self.canva_api_token = self.settings.canva_api_token
        self.canva_template_id = self.settings.canva_template_id
        self.canva_brand_kit_id = self.settings.canva_brand_kit_id
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def initialize(self):
        """Initialize the Flyer Agent"""
        logger.info("Initializing Flyer Agent...")
        
        # Create HTTP session for Canva API calls
        self.session = aiohttp.ClientSession(
            headers={
                'Authorization': f'Bearer {self.canva_api_token}',
                'Content-Type': 'application/json'
            },
            timeout=aiohttp.ClientTimeout(total=60)
        )
        
        # Verify Canva API connection
        if await self._verify_canva_connection():
            logger.info("✅ Flyer Agent initialized successfully")
        else:
            logger.warning("⚠️ Flyer Agent initialized but Canva API verification failed")
    
    async def _verify_canva_connection(self) -> bool:
        """Verify connection to Canva API"""
        try:
            async with self.session.get('https://api.canva.com/rest/v1/users/me') as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"Canva API verification failed: {e}")
            return False
    
    async def generate_flyer(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate an event flyer using Canva API and AI"""
        
        logger.info(f"Generating flyer for event: {event_data.get('title', 'Untitled')}")
        
        try:
            # Step 1: Generate design instructions using AI
            design_instructions = await self._generate_design_instructions(event_data, preferences, llm)
            
            # Step 2: Create flyer using Canva API
            flyer_result = await self._create_canva_flyer(event_data, preferences, design_instructions)
            
            # Step 3: Enhance with AI-generated text if needed
            if flyer_result.get('needs_text_enhancement'):
                flyer_result = await self._enhance_flyer_text(flyer_result, event_data, llm)
            
            logger.info(f"✅ Flyer generated successfully: {flyer_result.get('url', 'Generated')}")
            return flyer_result
            
        except Exception as e:
            logger.error(f"❌ Flyer generation failed: {e}")
            # Return fallback result for workflow continuation
            return {
                'error': str(e),
                'fallback_design': await self._generate_fallback_design(event_data, preferences)
            }
    
    async def _generate_design_instructions(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate AI-powered design instructions for the flyer"""
        
        flyer_style = preferences.get('flyer_style', 'professional')
        target_audience = preferences.get('target_audience', ['general-public'])
        key_messages = preferences.get('key_messages', [])
        
        # Create design prompt
        design_prompt = f"""
        Create detailed design instructions for an event flyer with these specifications:

        EVENT DETAILS:
        - Title: {event_data.get('title', 'Event Title')}
        - Type: {event_data.get('event_type', 'community')}
        - Date: {event_data.get('start_date', 'TBD')}
        - Location: {event_data.get('location', {}).get('name', 'TBD')}
        - Description: {event_data.get('description', 'Event description')}
        - Is Online: {event_data.get('location', {}).get('is_online', False)}

        DESIGN PREFERENCES:
        - Style: {flyer_style}
        - Target Audience: {', '.join(target_audience)}
        - Key Messages: {', '.join(key_messages)}
        - Include Logo: {preferences.get('include_logo', True)}

        Provide specific design instructions including:
        1. Color scheme and palette
        2. Typography recommendations
        3. Layout structure
        4. Visual elements and imagery suggestions
        5. Text hierarchy and emphasis
        6. Call-to-action placement

        Format as JSON with keys: colors, typography, layout, imagery, text_hierarchy, cta_placement
        """
        
        try:
            response = await llm.ainvoke([HumanMessage(content=design_prompt)])
            
            # Parse AI response to extract design instructions
            instructions_text = response.content
            
            # Simple parsing - in production, you might want more robust JSON parsing
            design_instructions = {
                'style': flyer_style,
                'ai_recommendations': instructions_text,
                'color_scheme': self._extract_color_scheme(flyer_style),
                'typography': self._get_typography_for_style(flyer_style),
                'layout': self._get_layout_for_event_type(event_data.get('event_type', 'community'))
            }
            
            logger.info("✅ Design instructions generated successfully")
            return design_instructions
            
        except Exception as e:
            logger.error(f"Failed to generate design instructions: {e}")
            # Return fallback instructions
            return self._get_fallback_design_instructions(flyer_style)
    
    async def _create_canva_flyer(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        design_instructions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create flyer using Canva API"""
        
        try:
            # Step 1: Create design from template
            design_id = await self._create_design_from_template(event_data, preferences)
            
            # Step 2: Update design elements
            await self._update_design_elements(design_id, event_data, design_instructions)
            
            # Step 3: Export flyer
            export_result = await self._export_flyer(design_id)
            
            return {
                'url': export_result.get('url'),
                'canva_id': design_id,
                'design_notes': design_instructions.get('ai_recommendations'),
                'export_format': 'PNG',
                'created_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Canva flyer creation failed: {e}")
            raise
    
    async def _create_design_from_template(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> str:
        """Create a new design from Canva template"""
        
        # Use specific template based on event type
        template_id = self._get_template_for_event_type(
            event_data.get('event_type', 'community'),
            preferences.get('flyer_style', 'professional')
        )
        
        payload = {
            'design_type': 'POSTER',
            'template_id': template_id or self.canva_template_id,
            'name': f"UIS Event Flyer - {event_data.get('title', 'Untitled Event')}"
        }
        
        try:
            async with self.session.post(
                'https://api.canva.com/rest/v1/designs',
                json=payload
            ) as response:
                if response.status == 201:
                    result = await response.json()
                    design_id = result.get('id')
                    logger.info(f"✅ Canva design created: {design_id}")
                    return design_id
                else:
                    error_text = await response.text()
                    raise Exception(f"Canva API error: {response.status} - {error_text}")
                    
        except Exception as e:
            logger.error(f"Failed to create Canva design: {e}")
            raise
    
    async def _update_design_elements(
        self,
        design_id: str,
        event_data: Dict[str, Any],
        design_instructions: Dict[str, Any]
    ):
        """Update design elements with event data"""
        
        try:
            # Get design elements
            async with self.session.get(
                f'https://api.canva.com/rest/v1/designs/{design_id}/elements'
            ) as response:
                if response.status != 200:
                    raise Exception(f"Failed to get design elements: {response.status}")
                
                elements = await response.json()
                
            # Update text elements
            for element in elements.get('elements', []):
                if element.get('type') == 'text':
                    await self._update_text_element(design_id, element, event_data)
                elif element.get('type') == 'image' and preferences.get('include_logo', True):
                    await self._update_image_element(design_id, element, event_data)
            
            logger.info(f"✅ Design elements updated for {design_id}")
            
        except Exception as e:
            logger.error(f"Failed to update design elements: {e}")
            # Don't raise - continue with template defaults
    
    async def _update_text_element(
        self,
        design_id: str,
        element: Dict[str, Any],
        event_data: Dict[str, Any]
    ):
        """Update a text element with event data"""
        
        element_id = element.get('id')
        current_text = element.get('text', '').lower()
        
        # Determine what text to update based on current content
        new_text = None
        
        if 'title' in current_text or 'event name' in current_text:
            new_text = event_data.get('title', 'Event Title')
        elif 'date' in current_text:
            new_text = self._format_event_date(event_data.get('start_date'))
        elif 'location' in current_text or 'venue' in current_text:
            location = event_data.get('location', {})
            if location.get('is_online'):
                new_text = 'Online Event'
            else:
                new_text = location.get('name', 'Location TBD')
        elif 'description' in current_text:
            new_text = event_data.get('description', '')[:100] + '...' if len(event_data.get('description', '')) > 100 else event_data.get('description', '')
        
        if new_text:
            try:
                payload = {
                    'text': new_text,
                    'font_size': element.get('font_size'),
                    'font_family': element.get('font_family')
                }
                
                async with self.session.patch(
                    f'https://api.canva.com/rest/v1/designs/{design_id}/elements/{element_id}',
                    json=payload
                ) as response:
                    if response.status == 200:
                        logger.debug(f"Updated text element: {element_id}")
                    
            except Exception as e:
                logger.error(f"Failed to update text element {element_id}: {e}")
    
    async def _export_flyer(self, design_id: str) -> Dict[str, Any]:
        """Export the flyer design"""
        
        export_payload = {
            'format': 'PNG',
            'quality': 'high',
            'width': 1080,
            'height': 1080
        }
        
        try:
            # Request export
            async with self.session.post(
                f'https://api.canva.com/rest/v1/designs/{design_id}/export',
                json=export_payload
            ) as response:
                if response.status == 202:
                    export_job = await response.json()
                    job_id = export_job.get('id')
                    
                    # Poll for completion
                    return await self._poll_export_status(job_id)
                else:
                    error_text = await response.text()
                    raise Exception(f"Export request failed: {response.status} - {error_text}")
                    
        except Exception as e:
            logger.error(f"Failed to export flyer: {e}")
            raise
    
    async def _poll_export_status(self, job_id: str, max_attempts: int = 30) -> Dict[str, Any]:
        """Poll export job status until completion"""
        
        for attempt in range(max_attempts):
            try:
                async with self.session.get(
                    f'https://api.canva.com/rest/v1/exports/{job_id}'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        status = result.get('status')
                        
                        if status == 'success':
                            return {
                                'url': result.get('url'),
                                'download_url': result.get('download_url')