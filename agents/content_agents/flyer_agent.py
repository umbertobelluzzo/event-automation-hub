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
    """Agent for generating event flyers using Templated.io API and AI"""
    
    def __init__(self):
        self.settings = get_settings()
        self.templated_api_key = self.settings.templated_api_key
        self.community_template_id = self.settings.templated_community_event_template_id # Specific template for now
        self.session: Optional[aiohttp.ClientSession] = None
        self.templated_base_url = "https://api.templated.io/v1"
        
        # Phasing out Canva settings - keep for now to avoid breaking old method calls if any
        self.canva_api_token = self.settings.canva_api_token
        self.canva_template_id = self.settings.canva_template_id
        self.canva_brand_kit_id = self.settings.canva_brand_kit_id
        
    async def initialize(self):
        """Initialize the Flyer Agent and verify Templated.io connection"""
        logger.info("Initializing Flyer Agent with Templated.io integration...")
        
        if not self.templated_api_key:
            logger.error("TEMPLATED_API_KEY not found in settings. Flyer generation will fail.")
            # Optionally, could prevent agent from starting or set a disabled state
            return

        # Create HTTP session for Templated.io API calls
        self.session = aiohttp.ClientSession(
            headers={
                'Authorization': f'Bearer {self.templated_api_key}',
                'Content-Type': 'application/json'
            },
            timeout=aiohttp.ClientTimeout(total=60)
        )
        
        if await self._verify_templated_connection():
            logger.info("✅ Flyer Agent (Templated.io) initialized and connection verified.")
        else:
            logger.warning("⚠️ Flyer Agent (Templated.io) initialized but API verification failed. Check API key and service status.")
    
    async def _verify_templated_connection(self) -> bool:
        """Verify connection to Templated.io API by fetching account info."""
        if not self.session:
            logger.error("HTTP session not initialized for Templated.io verification.")
            return False
        try:
            logger.info("Verifying Templated.io API connection by fetching /v1/account...")
            async with self.session.get(f'{self.templated_base_url}/account') as response:
                if response.status == 200:
                    account_info = await response.json()
                    logger.info(f"Templated.io connection successful. Account: {account_info.get('email')}, Usage: {account_info.get('apiUsage')}/{account_info.get('apiQuota')}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"Templated.io API verification failed. Status: {response.status}, Response: {error_text}")
                    return False
        except Exception as e:
            logger.error(f"Exception during Templated.io API verification: {e}", exc_info=True)
            return False
    
    async def _verify_canva_connection(self) -> bool:
        """Verify connection to Canva API - To be phased out"""
        if not self.canva_api_token or not self.session: # Original session was Canva-specific
            logger.info("Canva API token not set or session not initialized for Canva. Skipping verification.")
            return False # Or True if we don't want to block initialization due to Canva
        try:
            # This uses the session which is now configured for Templated.io headers.
            # For a true Canva verification, a separate session or header modification would be needed.
            # For now, let's make it clear it's not verifying Canva effectively.
            logger.warning("Canva verification is being phased out and uses Templated.io session headers. This check is not effective for Canva.")
            # async with self.session.get('https://api.canva.com/rest/v1/users/me') as response:
            #     return response.status == 200
            return False # Marking as false as it's not a real check anymore
        except Exception as e:
            logger.error(f"Canva API verification (phasing out) failed: {e}")
            return False
    
    async def generate_flyer(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate an event flyer using AI for design instructions and Templated.io API for creation."""
        
        event_title = event_data.get('title', 'Untitled Event')
        logger.info(f"[{event_title}] Starting flyer generation process...")
        
        try:
            # Step 1: Generate AI-powered design instructions
            logger.info(f"[{event_title}] Generating design instructions...")
            design_instructions = await self._generate_design_instructions(
                event_data=event_data,
                preferences=preferences,
                llm=llm
            )
            if design_instructions.get("error"):
                logger.error(f"[{event_title}] Failed to generate design instructions: {design_instructions['error']}")
                # Optionally, could proceed with fallback instructions or return error
                # For now, let's assume _generate_design_instructions handles its own fallbacks if critical
            
            logger.info(f"[{event_title}] Design instructions generated/retrieved.")

            # Step 2: Create flyer using Templated.io API
            logger.info(f"[{event_title}] Creating flyer via Templated.io API...")
            flyer_result = await self._create_templated_flyer(
                event_data=event_data,
                preferences=preferences,
                design_instructions=design_instructions
            )
            
            if flyer_result.get("error"):
                logger.error(f"[{event_title}] Templated.io flyer creation failed: {flyer_result['error']}")
                return {
                    'error': f"Templated.io flyer creation failed: {flyer_result['error']}",
                    'details': flyer_result.get('details') # Pass along any details from _create_templated_flyer
                }

            logger.info(f"[{event_title}] ✅ Flyer successfully generated: {flyer_result.get('flyer_url')}")
            return flyer_result

        except Exception as e:
            logger.error(f"[{event_title}] ❌ Unexpected error during flyer generation: {e}", exc_info=True)
            return {
                'error': f"Unexpected error during flyer generation: {str(e)}",
                'fallback_design': {'info': 'An unexpected error occurred, no flyer generated.'}
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
    
    async def _prepare_templated_payload(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        design_instructions: Dict[str, Any] # LLM-generated suggestions
    ) -> Dict[str, Any]:
        """Prepare the JSON payload for the Templated.io /v1/render endpoint."""
        
        # Start with the basic structure from the sample
        # We'll use the specific community_template_id loaded in __init__
        if not self.community_template_id:
            logger.error("Templated.io community_template_id not configured.")
            # This should ideally not happen if settings are loaded correctly
            raise ValueError("Templated.io community_template_id not configured.")

        # Extract values, using event_data as primary, then design_instructions or defaults
        event_title = event_data.get('title', 'Event Title')
        event_description = event_data.get('description', 'Event Description')
        
        # Date and Time Formatting - assuming event_data.start_date is an ISO string
        start_datetime_str = event_data.get('start_date')
        event_date_formatted = 'Date TBD'
        event_time_formatted = 'Time TBD'
        if start_datetime_str:
            try:
                dt_obj = datetime.fromisoformat(start_datetime_str.replace('Z', '+00:00')) # Handle Z for UTC
                event_date_formatted = dt_obj.strftime('%B %d, %Y') # e.g., May 30, 2025
                event_time_formatted = dt_obj.strftime('%I:%M %p') # e.g., 10:00 AM
            except ValueError:
                logger.warning(f"Could not parse start_date: {start_datetime_str}. Using TBD.")
                # Try to format just the date part if time is malformed or missing
                try:
                    dt_obj = datetime.fromisoformat(start_datetime_str.split('T')[0])
                    event_date_formatted = dt_obj.strftime('%B %d, %Y')
                except:
                    pass


        location_obj = event_data.get('location', {})
        event_location = location_obj.get('name', 'Event Location')
        if location_obj.get('is_online'):
            event_location = "Online Event"

        # Use AI recommendations if available, otherwise direct data or defaults
        # This is a simplified mapping. A more robust approach might involve the LLM
        # directly suggesting text for specific fields based on template layer names.
        ai_recs = design_instructions.get('ai_recommendations', "") # This is currently a string of text.
                                                                # Needs to be parsed if it's structured JSON.

        # For now, we'll directly map event data.
        # The 'color' fields in the sample payload seem to be for text color.
        # The LLM's 'color_scheme' could be used if Templated.io allows broader color changes
        # or if we decide to apply text colors dynamically based on a theme.

        # Determine background image URL
        background_image_url = event_data.get('custom_background_url') # Check if user provided one
        if not background_image_url:
            background_image_url = self._get_default_background_for_event_type(event_data.get('event_type', 'community'))
        if not background_image_url: # Fallback if default also not found
            background_image_url = 'https://via.placeholder.com/1080x1080.png?text=Event+Background'

        # Determine logo URL (you should replace the placeholder with your actual logo URL)
        # Option 1: Hardcode here
        uis_logo_url = 'https://drive.google.com/file/d/1_7irIo_cM72VzSihuDARA_7d7FkySvNl/view?usp=sharing' 
        # Option 2: Or load from settings if you added it there (self.settings.uis_logo_url_dark_bg)
        # if not uis_logo_url:
        # uis_logo_url = 'https://via.placeholder.com/300x100.png?text=UIS+Logo' # Final fallback

        payload = {
            'template': self.community_template_id,
            'async': False,  # Request synchronous rendering
            'format': 'png', # Desired output format
            # 'name': f"Flyer for {event_title}", # Optional: custom name for the render
            'layers': {
                'bottomleft-white-square': {},
                'bottomright-beige-square': {},
                'call-to-action': {
                    'text': preferences.get('call_to_action', 'Register Now!'),
                    'color': '#FFFFFF'
                },
                'event-description': {
                    'text': event_description,
                    'color': '#FFFFFF'
                },
                'bottomright-black-separator': {},
                'event-date': {
                    'text': event_date_formatted,
                    'color': '#FFFFFF'
                },
                'background-image': {
                    'image_url': background_image_url
                },
                'event-time': {
                    'text': event_time_formatted,
                    'color': '#FFFFFF'
                },
                'event-location': {
                    'text': event_location,
                    'color': '#FFFFFF'
                },
                'tickets-announcement': {
                    'text': preferences.get('tickets_announcement', 'Limited Tickets!'),
                    'color': '#FFFFFF'
                },
                'event-title': {
                    'text': event_title,
                    'color': 'rgba(255, 255, 255, 0.88)'
                },
                'uis-logo-sfscuro': {
                    'image_url': uis_logo_url
                }
            }
        }
        logger.info(f"Prepared Templated.io payload for template {self.community_template_id}")
        return payload

    async def _create_templated_flyer(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        design_instructions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create flyer using Templated.io API's /v1/render endpoint."""
        
        if not self.session:
            logger.error("HTTP session not initialized for Templated.io.")
            return {'error': "HTTP session not initialized."}

        try:
            payload = await self._prepare_templated_payload(
                event_data, preferences, design_instructions
            )
            
            event_title_log = event_data.get('title', 'N/A') # For logging
            logger.info(f"Sending render request to Templated.io for event: {event_title_log}")
            
            async with self.session.post(
                f'{self.templated_base_url}/render',
                json=payload
            ) as response:
                # Templated.io doc says POST /v1/render responds with 202 Accepted for async
                # but for synchronous (async: false), it might respond with 200 OK or 201 Created
                # once the render is actually complete.
                
                response_status = response.status
                try:
                    response_data = await response.json()
                except Exception as json_exc:
                    raw_response_text = await response.text()
                    logger.error(f"Templated.io API response not valid JSON. Status: {response_status}, Response: {raw_response_text}", exc_info=json_exc)
                    return {
                        'error': f"Templated.io API response not valid JSON: {response_status}",
                        'details': raw_response_text
                    }

                logger.info(f"Templated.io /render response. Status: {response_status}, Data: {response_data}")

                if response_status in [200, 201, 202]: # 202 if it still queues despite async:false, 200/201 if truly sync
                    render_id = response_data.get('id')
                    render_status = response_data.get('status')
                    image_url = response_data.get('url')

                    if render_status == 'COMPLETED' and image_url:
                        logger.info(f"Templated.io synchronous render successful for {render_id}")
                        return {
                            'flyer_url': image_url,
                            'flyer_render_id': render_id,
                            'flyer_template_id': response_data.get('templateId', payload['template']),
                            'design_notes': design_instructions.get('ai_recommendations'),
                            'flyer_format': response_data.get('format', 'png'),
                            'created_at': response_data.get('createdAt', datetime.utcnow().isoformat())
                        }
                    elif render_status == 'PENDING' and render_id:
                        logger.warning(f"Templated.io render {render_id} is PENDING despite async:false. Polling will be required.")
                        return await self._poll_templated_render_status(render_id, design_instructions.get('ai_recommendations'), payload['template'])
                    elif render_id: # Status might be something else, or URL missing
                        logger.error(f"Templated.io render {render_id} status is '{render_status}' or URL is missing. URL: {image_url}")
                        return {
                            'error': f"Templated.io render status '{render_status}' or URL missing.",
                            'render_id': render_id,
                            'details': response_data
                        }
                    else:
                        logger.error(f"Templated.io response missing render ID. Response: {response_data}")
                        return {
                            'error': "Templated.io response did not contain render ID.",
                            'details': response_data
                        }
                else: # Handle other error statuses e.g. 400, 401, 403, 500
                    logger.error(f"Templated.io API error during render. Status: {response_status}, Response: {response_data}, Sent Payload: {payload}")
                    return {
                        'error': f"Templated.io API error: {response_status}",
                        'details': response_data 
                    }
                    
        except ValueError as ve: # Catch errors from _prepare_templated_payload e.g. missing template id
             logger.error(f"Error preparing Templated.io payload: {ve}", exc_info=True)
             return {'error': f"Payload preparation error: {str(ve)}"}
        except Exception as e:
            logger.error(f"Templated.io flyer creation failed: {e}", exc_info=True)
            # Consider if this should re-raise or return a structured error
            return {
                'error': f"Unexpected error during Templated.io flyer creation: {str(e)}"
            }
    
    async def _enhance_flyer_text(
        self,
        flyer_result: Dict[str, Any],
        event_data: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Enhance flyer text using AI if needed"""
        
        try:
            enhancement_prompt = f"""
            Enhance the text content for this event flyer to make it more engaging and compelling:

            EVENT: {event_data.get('title', 'Event')}
            DESCRIPTION: {event_data.get('description', '')}
            TARGET AUDIENCE: {event_data.get('target_audience', 'General public')}

            Current flyer has basic event information. Suggest:
            1. A catchy headline/tagline
            2. Key benefits or highlights to emphasize
            3. Call-to-action phrases
            4. Any missing information that would increase attendance

            Keep suggestions concise and appropriate for a flyer format.
            """
            
            response = await llm.ainvoke([HumanMessage(content=enhancement_prompt)])
            
            flyer_result['text_enhancements'] = response.content
            flyer_result['needs_text_enhancement'] = False
            
            logger.info("✅ Flyer text enhancement completed")
            
        except Exception as e:
            logger.error(f"Failed to enhance flyer text: {e}")
            flyer_result['enhancement_error'] = str(e)
        
        return flyer_result
    
    # =============================================================================
    # Helper Methods
    # =============================================================================
    
    def _extract_color_scheme(self, style: str) -> Dict[str, str]:
        """Extract color scheme based on style"""
        
        color_schemes = {
            'professional': {
                'primary': '#2C3E50',
                'secondary': '#3498DB',
                'accent': '#E74C3C',
                'background': '#FFFFFF',
                'text': '#2C3E50'
            },
            'creative': {
                'primary': '#9B59B6',
                'secondary': '#F39C12',
                'accent': '#E67E22',
                'background': '#F8F9FA',
                'text': '#2C3E50'
            },
            'modern': {
                'primary': '#1ABC9C',
                'secondary': '#34495E',
                'accent': '#F1C40F',
                'background': '#FFFFFF',
                'text': '#2C3E50'
            },
            'elegant': {
                'primary': '#8E44AD',
                'secondary': '#95A5A6',
                'accent': '#E74C3C',
                'background': '#FFFFFF',
                'text': '#2C3E50'
            }
        }
        
        return color_schemes.get(style, color_schemes['professional'])
    
    def _get_typography_for_style(self, style: str) -> Dict[str, str]:
        """Get typography recommendations for style"""
        
        typography = {
            'professional': {
                'heading': 'Montserrat',
                'body': 'Open Sans',
                'accent': 'Roboto'
            },
            'creative': {
                'heading': 'Playfair Display',
                'body': 'Source Sans Pro',
                'accent': 'Dancing Script'
            },
            'modern': {
                'heading': 'Poppins',
                'body': 'Inter',
                'accent': 'Space Grotesk'
            },
            'elegant': {
                'heading': 'Crimson Text',
                'body': 'Lato',
                'accent': 'Great Vibes'
            }
        }
        
        return typography.get(style, typography['professional'])
    
    def _get_layout_for_event_type(self, event_type: str) -> Dict[str, Any]:
        """Get layout preferences for event type"""
        
        layouts = {
            'conference': {
                'structure': 'formal',
                'emphasis': 'speakers',
                'sections': ['title', 'speakers', 'agenda', 'registration']
            },
            'workshop': {
                'structure': 'educational',
                'emphasis': 'learning',
                'sections': ['title', 'what_you_learn', 'instructor', 'registration']
            },
            'social': {
                'structure': 'fun',
                'emphasis': 'community',
                'sections': ['title', 'highlights', 'date_location', 'contact']
            },
            'fundraiser': {
                'structure': 'cause-focused',
                'emphasis': 'impact',
                'sections': ['title', 'cause', 'goal', 'how_to_help']
            },
            'community': {
                'structure': 'welcoming',
                'emphasis': 'participation',
                'sections': ['title', 'description', 'benefits', 'join_us']
            }
        }
        
        return layouts.get(event_type, layouts['community'])
    
    def _get_template_for_event_type(self, event_type: str, style: str) -> Optional[str]:
        """Get specific Templated.io template based on event type and style"""
        
        # Template mapping - in production, these would be actual Templated.io template IDs
        templates = {
            'conference': {
                'professional': 'DAFGX_conference_professional',
                'modern': 'DAFGX_conference_modern',
                'creative': 'DAFGX_conference_creative'
            },
            'workshop': {
                'professional': 'DAFGX_workshop_professional',
                'modern': 'DAFGX_workshop_modern',
                'creative': 'DAFGX_workshop_creative'
            },
            'social': {
                'fun': 'DAFGX_social_fun',
                'modern': 'DAFGX_social_modern',
                'creative': 'DAFGX_social_creative'
            }
        }
        
        return templates.get(event_type, {}).get(style)
    
    def _get_fallback_design_instructions(self, style: str) -> Dict[str, Any]:
        """Get fallback design instructions when AI fails"""
        
        return {
            'style': style,
            'ai_recommendations': 'Using fallback design template for event flyer.',
            'color_scheme': self._extract_color_scheme(style),
            'typography': self._get_typography_for_style(style),
            'layout': self._get_layout_for_event_type('community')
        }
    
    def _format_event_date(self, date_str: Optional[str]) -> str:
        """Format event date for display"""
        
        if not date_str:
            return 'Date TBD'
        
        try:
            # Parse various date formats
            from datetime import datetime
            
            # Try common formats
            formats = [
                '%Y-%m-%d',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%m/%d/%Y',
                '%d/%m/%Y'
            ]
            
            for fmt in formats:
                try:
                    date_obj = datetime.strptime(date_str.split('T')[0] if 'T' in date_str else date_str, fmt.split('T')[0] if 'T' in fmt else fmt)
                    return date_obj.strftime('%B %d, %Y')
                except ValueError:
                    continue
            
            # If parsing fails, return original string
            return date_str
            
        except Exception as e:
            logger.error(f"Failed to format date {date_str}: {e}")
            return date_str or 'Date TBD'
    
    async def _generate_fallback_design(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate fallback design when Templated.io API fails"""
        
        logger.info("Generating fallback design due to Templated.io API failure")
        
        return {
            'type': 'fallback',
            'title': event_data.get('title', 'Event Title'),
            'date': self._format_event_date(event_data.get('start_date')),
            'location': event_data.get('location', {}).get('name', 'Location TBD'),
            'description': event_data.get('description', ''),
            'style': preferences.get('flyer_style', 'professional'),
            'color_scheme': self._extract_color_scheme(preferences.get('flyer_style', 'professional')),
            'typography': self._get_typography_for_style(preferences.get('flyer_style', 'professional')),
            'message': 'Flyer design data available for manual creation',
            'created_at': datetime.utcnow().isoformat()
        }
    
    # =============================================================================
    # Cleanup
    # =============================================================================
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Flyer Agent...")
        
        if self.session and not self.session.closed:
            await self.session.close()
        
        logger.info("✅ Flyer Agent cleanup completed")

    # _poll_export_status (Canva specific, might be adapted for Templated.io if it uses polling)

    async def _poll_templated_render_status(self, render_id: str, design_notes: Optional[str], template_id_used: str, max_attempts: int = 15, delay_seconds: int = 2) -> Dict[str, Any]:
        """Poll Templated.io GET /v1/render/:id for render completion."""
        logger.info(f"Polling Templated.io for render_id: {render_id}...")
        if not self.session:
            logger.error("HTTP session not initialized for Templated.io polling.")
            return {'error': "HTTP session not initialized for polling."}

        for attempt in range(max_attempts):
            try:
                logger.debug(f"Polling attempt {attempt + 1}/{max_attempts} for render_id: {render_id}")
                async with self.session.get(f'{self.templated_base_url}/render/{render_id}') as response:
                    response_status = response.status
                    try:
                        render_data = await response.json()
                    except Exception as json_exc:
                        raw_response_text = await response.text()
                        logger.error(f"Polling: Templated.io API response not valid JSON. Status: {response_status}, Response: {raw_response_text}", exc_info=json_exc)
                        # Potentially retry or fail after several such errors
                        await asyncio.sleep(delay_seconds)
                        continue

                    logger.debug(f"Polling response for {render_id}. Status: {response_status}, Data: {render_data}")

                    if response_status == 200:
                        current_status = render_data.get('status')
                        image_url = render_data.get('url')

                        if current_status == 'COMPLETED' and image_url:
                            logger.info(f"Polling successful: Render {render_id} COMPLETED. URL: {image_url}")
                            return {
                                'flyer_url': image_url,
                                'flyer_render_id': render_id,
                                'flyer_template_id': render_data.get('templateId', template_id_used),
                                'design_notes': design_notes,
                                'flyer_format': render_data.get('format', 'png'),
                                'created_at': render_data.get('createdAt', datetime.utcnow().isoformat())
                            }
                        elif current_status == 'FAILED':
                            logger.error(f"Polling: Render {render_id} FAILED. Details: {render_data.get('errorDetails') or render_data}")
                            return {
                                'error': f"Templated.io render {render_id} failed.",
                                'render_id': render_id,
                                'details': render_data
                            }
                        elif current_status == 'PENDING':
                            logger.info(f"Polling: Render {render_id} is still PENDING. Waiting {delay_seconds}s...")
                        else:
                            logger.warning(f"Polling: Render {render_id} has unknown status '{current_status}'. Data: {render_data}")
                            # Continue polling for a bit more
                    else:
                        logger.error(f"Polling: Error fetching status for render {render_id}. Status: {response_status}, Response: {render_data}")
                        # Don't immediately fail, could be a transient issue. Loop will retry.
                
            except Exception as e:
                logger.error(f"Polling: Exception during attempt {attempt + 1} for render {render_id}: {e}", exc_info=True)
                # Don't immediately fail, loop will retry.
            
            if attempt < max_attempts - 1:
                await asyncio.sleep(delay_seconds)
        
        logger.error(f"Polling: Render {render_id} did not complete after {max_attempts} attempts.")
        return {
            'error': f"Templated.io render {render_id} timed out after polling.",
            'render_id': render_id
        }

    def _get_default_background_for_event_type(self, event_type: str) -> Optional[str]:
        """Return a default background image URL based on event type."""
        # TODO: Populate with actual URLs to default background images hosted publicly
        # These should be direct image links.
        default_backgrounds = {
            'COMMUNITY': 'https://drive.google.com/file/d/1_7irIo_cM72VzSihuDARA_7d7FkySvNl/view?usp=sharing',
            'SPEAKER': 'https://drive.google.com/file/d/1YDjqsEDKpjrRbQQNbh6u-Un5y2LtwkSP/view?usp=drive_link',
            'NETWORKING': 'https://drive.google.com/file/d/1H1qNezMYlbo_p3ls3_hYWZU-oV9lV7mW/view?usp=sharing',
            'CULTURAL': 'https://drive.google.com/file/d/1zOPifib2b7fvF8xceJIgiTBO1vGGcn98/view?usp=sharing',
            'EDUCATIONAL': 'https://drive.google.com/file/d/1H1qNezMYlbo_p3ls3_hYWZU-oV9lV7mW/view?usp=sharing',
            'SOCIAL': 'https://drive.google.com/file/d/1_7irIo_cM72VzSihuDARA_7d7FkySvNl/view?usp=sharing',
            # Add other event types from your Prisma schema
        }
        normalized_event_type = event_type.upper() # Ensure consistent casing
        url = default_backgrounds.get(normalized_event_type)
        if url:
            logger.info(f"Using default background for event type '{normalized_event_type}': {url}")
        else:
            logger.warning(f"No default background found for event type '{normalized_event_type}'.")
        return url

    async def _create_design_from_template(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        design_instructions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a design from a template"""
        
        # Implementation of _create_design_from_template method
        # This method should return a dictionary with the design data
        # You can implement the logic to create a design from a template here
        # This is a placeholder and should be replaced with the actual implementation
        return {}