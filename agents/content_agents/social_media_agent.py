# =============================================================================
# agents/content_agents/social_media_agent.py - Social Media Content Generation Agent
# =============================================================================

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import re

from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class SocialMediaAgent:
    """Agent for generating social media content across multiple platforms"""
    
    def __init__(self):
        self.settings = get_settings()
        self.platform_configs = {
            'instagram': {
                'max_length': 2200,
                'hashtag_limit': 30,
                'tone': 'visual_focused',
                'emoji_heavy': True
            },
            'linkedin': {
                'max_length': 3000,
                'hashtag_limit': 5,
                'tone': 'professional',
                'emoji_heavy': False
            },
            'twitter': {
                'max_length': 280,
                'hashtag_limit': 2,
                'tone': 'concise',
                'emoji_heavy': True
            },
            'facebook': {
                'max_length': 8000,
                'hashtag_limit': 5,
                'tone': 'conversational',
                'emoji_heavy': False
            }
        }
    
    async def initialize(self):
        """Initialize the Social Media Agent"""
        logger.info("Initializing Social Media Agent...")
        logger.info("✅ Social Media Agent initialized successfully")
    
    async def generate_content(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        flyer_url: str,
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate social media captions for Instagram, LinkedIn, and Twitter."""
        
        event_title = event_data.get('title', 'Untitled')
        logger.info(f"Generating social media captions for event: {event_title} using flyer: {flyer_url}")
        
        # Fixed platforms
        platforms = ['instagram', 'linkedin', 'twitter']
        generated_captions = {}
        errors = []

        for platform in platforms:
            try:
                if platform in self.platform_configs:
                    caption = await self._generate_platform_caption(
                        platform, event_data, preferences, flyer_url, llm
                    )
                    if caption.get("error"):
                        errors.append(f"{platform.title()}: {caption['error']}")
                        generated_captions[f'{platform}_caption'] = None # Or some error placeholder
                    else:
                        generated_captions[f'{platform}_caption'] = caption.get('caption_text')
                else:
                    logger.warning(f"Configuration for platform {platform} not found. Skipping.")
                    errors.append(f"{platform.title()}: Configuration not found.")
            
            except Exception as e:
                logger.error(f"❌ Error generating caption for {platform.title()} for event {event_title}: {e}", exc_info=True)
                errors.append(f"{platform.title()}: {str(e)}")
                generated_captions[f'{platform}_caption'] = None

        if errors:
            generated_captions['social_media_error'] = "; ".join(errors)
            logger.error(f"Social media caption generation for event {event_title} encountered errors: {'; '.join(errors)}")
        
        logger.info(f"✅ Social media captions generated for event {event_title}")
        return generated_captions
            
    async def _generate_platform_caption(
        self,
        platform: str,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        flyer_url: str,
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate a caption for a specific platform."""
        
        config = self.platform_configs[platform]
        
        prompt = self._build_caption_prompt(platform, event_data, preferences, config, flyer_url)
        
        try:
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            raw_content = response.content
            
            caption_text = self._format_caption_from_response(platform, raw_content, config)
            
            if not caption_text:
                logger.error(f"❌ {platform.title()} caption generation failed: Could not extract caption from LLM response.")
                return {'error': "Could not extract caption from LLM response."}

            logger.info(f"✅ {platform.title()} caption generated successfully")
            return {'caption_text': caption_text}
            
        except Exception as e:
            logger.error(f"❌ {platform.title()} caption generation failed during LLM call or formatting: {e}", exc_info=True)
            return {
                'error': str(e)
                # 'fallback_content': self._generate_fallback_content(platform, event_data) # Fallback can be added later if needed
            }
    
    def _build_caption_prompt(
        self,
        platform: str,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        config: Dict[str, Any],
        flyer_url: str
    ) -> str:
        """Build platform-specific prompt for caption generation."""
        
        title = event_data.get('title', 'Event')
        description = event_data.get('description', '')
        date = self._format_event_date(event_data.get('start_date'))
        location_obj = event_data.get('location', {})
        event_type = event_data.get('event_type', 'community')
        
        if location_obj.get('is_online'):
            location_str = 'Online Event'
        else:
            location_str = location_obj.get('name', 'Location TBD')
        
        target_audience = preferences.get('target_audience', ['general-public'])
        key_messages = preferences.get('key_messages', [])
        # General tone preference can be used if desired, or let platform specifics dominate
        # social_tone = preferences.get('social_tone', 'engaging') 

        # Simplified platform-specific instructions focusing on caption for an existing flyer
        platform_specific_guidance = {
            'instagram': "Write a visually engaging Instagram caption. Use relevant emojis and include a strong call-to-action. Focus on community and visual appeal.",
            'linkedin': "Write a professional yet engaging LinkedIn caption. Focus on networking, learning outcomes, or community impact. Use minimal emojis and highlight professional or community value.",
            'twitter': "Write a concise and impactful Twitter/X caption (under 280 characters). Create urgency or excitement and include a clear call-to-action. Emojis can be used."
        }
        
        return f"""
        CONTEXT:
        You are an AI assistant for United Italian Societies, a cultural organization.
        An event flyer has already been created. Its image can be found at: {flyer_url}
        Your task is to generate ONLY the caption text for a social media post on {platform.upper()} that will accompany this flyer.

        EVENT DETAILS:
        - Title: {title}
        - Type: {event_type}
        - Date: {date}
        - Location: {location_str}
        - Description (brief): {description[:150]}...

        AUDIENCE & MESSAGING PREFERENCES:
        - Target Audience: {', '.join(target_audience)}
        - Key Messages to incorporate: {', '.join(key_messages) if key_messages else 'Community engagement, cultural celebration, join us!'}
        - Desired Tone: {config['tone']} (e.g., {platform_specific_guidance.get(platform, '')})

        PLATFORM REQUIREMENTS for the caption:
        - Platform: {platform.upper()}
        - Maximum Caption Length: {config['max_length']} characters. Be mindful of this.
        - Hashtags: Include a few relevant hashtags directly within or at the end of the caption. Limit to {config['hashtag_limit']}.
        - Emojis: Use them appropriately for the platform ({'liberally' if config['emoji_heavy'] else 'sparingly'}).
        
        INSTRUCTIONS:
        Generate ONLY the social media post caption text. The caption should be ready to copy-paste.
        Do NOT include section headers like "CAPTION:", "POST:", "HASHTAGS:", etc. in your response.
        Just provide the caption text itself.

        Example of a good response (just the text):
        "Join us for an amazing evening celebrating Italian culture at {title}! 🥳🇮🇹 Happening on {date} at {location_str}. We'll have music, food, and great company. Don't miss out! #ItalianCulture #CommunityEvent #[RelevantHashtag]"
        
        CAPTION TEXT:
        """
    
    def _format_caption_from_response(
        self,
        platform: str,
        raw_content: str,
        config: Dict[str, Any]
    ) -> Optional[str]:
        """Extracts the caption text from the LLM's raw response."""
        
        # Expecting the LLM to return just the caption text directly
        # based on the new prompt instructions.
        caption_text = raw_content.strip()

        # Basic clean-up: remove "CAPTION:" if it somehow still appears despite instructions
        if caption_text.upper().startswith("CAPTION:"):
            caption_text = caption_text[len("CAPTION:"):].strip()
        
        # Optional: Further clean-up specific to platform if necessary
        # e.g., removing extra newlines that might not be ideal for some platforms

        # Validate length (optional, but good practice)
        if len(caption_text) > config['max_length']:
            logger.warning(f"{platform.title()} caption generated exceeds max length of {config['max_length']}. Truncating. Original length: {len(caption_text)}")
            # A more sophisticated truncation might be needed to keep full words/sentences
            caption_text = self._truncate_content(caption_text, config['max_length'])
            
        if not caption_text:
            return None
            
        return caption_text

    def _truncate_content(self, content: str, max_length: int) -> str:
        """Basic truncation to max_length, attempting to keep last word whole."""
        if len(content) <= max_length:
            return content
        
        truncated = content[:max_length]
        # Try to avoid cutting mid-word
        last_space = truncated.rfind(' ')
        if last_space != -1:
            return truncated[:last_space] + "..."
        return truncated + "..."

    def _format_event_date(self, date_str: Optional[str]) -> str:
        """Format event date for display"""
        
        if not date_str:
            return 'Date TBD'
        
        try:
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
            
            return date_str
            
        except Exception as e:
            logger.error(f"Failed to format date {date_str}: {e}")
            return date_str or 'Date TBD'
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Social Media Agent...")
        logger.info("✅ Social Media Agent cleanup completed")