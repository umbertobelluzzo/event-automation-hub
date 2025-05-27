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
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate social media content for all platforms"""
        
        logger.info(f"Generating social media content for event: {event_data.get('title', 'Untitled')}")
        
        try:
            # Determine which platforms to generate content for
            platforms = preferences.get('social_platforms', ['instagram', 'linkedin', 'facebook'])
            
            generated_content = {}
            
            # Generate content for each platform
            for platform in platforms:
                if platform in self.platform_configs:
                    content = await self._generate_platform_content(
                        platform, event_data, preferences, llm
                    )
                    generated_content[platform] = content
            
            logger.info(f"✅ Social media content generated for {len(generated_content)} platforms")
            return generated_content
            
        except Exception as e:
            logger.error(f"❌ Social media content generation failed: {e}")
            return {'error': str(e)}
    
    async def _generate_platform_content(
        self,
        platform: str,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate content for a specific platform"""
        
        config = self.platform_configs[platform]
        
        # Build platform-specific prompt
        prompt = self._build_platform_prompt(platform, event_data, preferences, config)
        
        try:
            # Generate content using LLM
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            raw_content = response.content
            
            # Process and format the content
            formatted_content = self._format_platform_content(
                platform, raw_content, event_data, config
            )
            
            logger.info(f"✅ {platform.title()} content generated successfully")
            return formatted_content
            
        except Exception as e:
            logger.error(f"❌ {platform.title()} content generation failed: {e}")
            return {
                'error': str(e),
                'fallback_content': self._generate_fallback_content(platform, event_data)
            }
    
    def _build_platform_prompt(
        self,
        platform: str,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        config: Dict[str, Any]
    ) -> str:
        """Build platform-specific prompt for content generation"""
        
        # Extract event details
        title = event_data.get('title', 'Event')
        description = event_data.get('description', '')
        date = self._format_event_date(event_data.get('start_date'))
        location = event_data.get('location', {})
        event_type = event_data.get('event_type', 'community')
        
        # Get location string
        if location.get('is_online'):
            location_str = 'Online Event'
        else:
            location_str = location.get('name', 'Location TBD')
        
        # Get target audience and key messages
        target_audience = preferences.get('target_audience', ['general-public'])
        key_messages = preferences.get('key_messages', [])
        tone = preferences.get('tone', 'engaging')
        
        # Platform-specific instructions
        platform_instructions = {
            'instagram': """
Create an Instagram post that is visually engaging and uses relevant hashtags:
- Use emojis throughout the text to make it visually appealing
- Include a strong call-to-action
- Add relevant hashtags (max 30, but focus on the most relevant 10-15)
- Write in a friendly, community-focused tone
- Mention photo opportunities or visual aspects of the event
""",
            'linkedin': """
Create a LinkedIn post that is professional yet engaging:
- Use a professional tone while remaining approachable
- Focus on networking opportunities, learning outcomes, or community impact
- Include 3-5 relevant hashtags
- Use minimal emojis (1-2 maximum)
- Highlight professional benefits or community value
""",
            'twitter': """
Create a Twitter/X post that is concise and impactful:
- Stay under 280 characters including hashtags
- Use 1-2 relevant hashtags maximum
- Include emojis for visual appeal
- Create urgency or excitement
- Include a clear call-to-action
""",
            'facebook': """
Create a Facebook post that encourages community engagement:
- Use a conversational, community-focused tone
- Ask questions to encourage comments and engagement
- Include relevant details that help people understand the value
- Use 3-5 hashtags maximum
- Encourage sharing with friends who might be interested
"""
        }
        
        return f"""
        Create engaging social media content for {platform.upper()} with these specifications:

        EVENT DETAILS:
        - Title: {title}
        - Type: {event_type}
        - Date: {date}
        - Location: {location_str}
        - Description: {description[:200]}...

        TARGET & MESSAGING:
        - Target Audience: {', '.join(target_audience)}
        - Key Messages: {', '.join(key_messages) if key_messages else 'Community engagement, cultural celebration'}
        - Desired Tone: {tone}

        PLATFORM REQUIREMENTS:
        - Maximum Length: {config['max_length']} characters
        - Hashtag Limit: {config['hashtag_limit']}
        - Platform Tone: {config['tone']}
        - Use Emojis: {'Yes, use them liberally' if config['emoji_heavy'] else 'Use sparingly (1-2 maximum)'}

        {platform_instructions.get(platform, '')}

        ORGANIZATION CONTEXT:
        This is for United Italian Societies, a cultural organization celebrating Italian heritage and community.

        Please provide:
        1. Main post text
        2. Suggested hashtags (separated)
        3. Call-to-action phrase
        4. Best posting time recommendation

        Format your response as:
        POST:
        [Your main post content here]

        HASHTAGS:
        [List hashtags separated by spaces]

        CALL-TO-ACTION:
        [Specific call-to-action phrase]

        POSTING-TIME:
        [Recommended posting time and day]
        """
    
    def _format_platform_content(
        self,
        platform: str,
        raw_content: str,
        event_data: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format and structure the generated content"""
        
        try:
            # Parse the AI response
            sections = self._parse_ai_response(raw_content)
            
            # Extract main content
            main_content = sections.get('POST', raw_content).strip()
            hashtags = sections.get('HASHTAGS', '').strip()
            cta = sections.get('CALL-TO-ACTION', '').strip()
            posting_time = sections.get('POSTING-TIME', '').strip()
            
            # Validate length constraints
            if len(main_content) > config['max_length']:
                main_content = self._truncate_content(main_content, config['max_length'])
            
            # Process hashtags
            hashtag_list = self._process_hashtags(hashtags, config['hashtag_limit'])
            
            # Generate post variants
            variants = self._generate_content_variants(
                main_content, hashtag_list, event_data, platform
            )
            
            formatted_content = {
                'platform': platform,
                'main_content': main_content,
                'hashtags': hashtag_list,
                'call_to_action': cta,
                'posting_time': posting_time,
                'character_count': len(main_content),
                'variants': variants,
                'engagement_tips': self._get_engagement_tips(platform),
                'created_at': datetime.utcnow().isoformat()
            }
            
            return formatted_content
            
        except Exception as e:
            logger.error(f"Failed to format {platform} content: {e}")
            return self._generate_fallback_content(platform, event_data)
    
    def _parse_ai_response(self, response: str) -> Dict[str, str]:
        """Parse structured AI response into sections"""
        
        sections = {}
        current_section = None
        current_content = []
        
        lines = response.split('\n')
        
        for line in lines:
            line = line.strip()
            
            # Check if this line is a section header
            if line.endswith(':') and line.upper() in ['POST:', 'HASHTAGS:', 'CALL-TO-ACTION:', 'POSTING-TIME:']:
                # Store previous section
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                
                # Start new section
                current_section = line[:-1].upper()
                current_content = []
            else:
                # Add to current section
                if current_section:
                    current_content.append(line)
        
        # Store final section
        if current_section:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
    
    def _process_hashtags(self, hashtags_text: str, limit: int) -> List[str]:
        """Process and validate hashtags"""
        
        if not hashtags_text:
            return []
        
        # Extract hashtags using regex
        hashtag_pattern = r'#\w+'
        hashtags = re.findall(hashtag_pattern, hashtags_text)
        
        # If no hashtags found with #, try to extract words and add #
        if not hashtags:
            words = hashtags_text.replace('#', '').split()
            hashtags = [f'#{word.strip()}' for word in words if word.strip()]
        
        # Clean and validate hashtags
        cleaned_hashtags = []
        for tag in hashtags:
            if not tag.startswith('#'):
                tag = f'#{tag}'
            
            # Remove special characters except alphanumeric and underscore
            tag = re.sub(r'[^#\w]', '', tag)
            
            if len(tag) > 1:  # Must have content after #
                cleaned_hashtags.append(tag)
        
        # Limit number of hashtags
        return cleaned_hashtags[:limit]
    
    def _truncate_content(self, content: str, max_length: int) -> str:
        """Truncate content while preserving word boundaries"""
        
        if len(content) <= max_length:
            return content
        
        # Find the last space before the limit
        truncated = content[:max_length]
        last_space = truncated.rfind(' ')
        
        if last_space > max_length * 0.8:  # Only truncate at word boundary if close enough
            truncated = truncated[:last_space]
        
        return truncated + '...'
    
    def _generate_content_variants(
        self,
        main_content: str,
        hashtags: List[str],
        event_data: Dict[str, Any],
        platform: str
    ) -> List[Dict[str, str]]:
        """Generate alternative content variations"""
        
        variants = []
        
        try:
            # Variant 1: Shorter version
            short_variant = self._create_short_variant(main_content, event_data)
            variants.append({
                'type': 'short',
                'content': short_variant,
                'description': 'Concise version for maximum engagement'
            })
            
            # Variant 2: Question-focused version
            question_variant = self._create_question_variant(main_content, event_data)
            variants.append({
                'type': 'question',
                'content': question_variant,
                'description': 'Question-based to encourage comments'
            })
            
            # Variant 3: Urgency-focused version (for events with dates)
            if event_data.get('start_date'):
                urgency_variant = self._create_urgency_variant(main_content, event_data)
                variants.append({
                    'type': 'urgency',
                    'content': urgency_variant,
                    'description': 'Creates urgency and encourages immediate action'
                })
            
        except Exception as e:
            logger.error(f"Failed to generate variants for {platform}: {e}")
        
        return variants
    
    def _create_short_variant(self, content: str, event_data: Dict[str, Any]) -> str:
        """Create a shorter, more concise version"""
        
        title = event_data.get('title', 'Event')
        date = self._format_event_date(event_data.get('start_date'))
        
        # Extract first sentence or main point
        sentences = content.split('.')
        first_sentence = sentences[0].strip() if sentences else content
        
        return f"🎉 {title} - {date}! {first_sentence}. Don't miss out!"
    
    def _create_question_variant(self, content: str, event_data: Dict[str, Any]) -> str:
        """Create a question-focused variant to encourage engagement"""
        
        title = event_data.get('title', 'Event')
        event_type = event_data.get('event_type', 'event')
        
        questions = {
            'cultural': f"What's your favorite Italian tradition? Join us at {title} to celebrate our heritage!",
            'social': f"Looking for a great time with the community? Who's joining us at {title}?",
            'educational': f"Ready to learn something new? What are you most excited about at {title}?",
            'fundraiser': f"Want to make a difference in our community? How can we reach our goal together at {title}?",
            'workshop': f"Ready to develop new skills? What do you hope to learn at {title}?",
            'conference': f"Who's ready for an inspiring day of learning? What speaker are you most excited to hear at {title}?"
        }
        
        return questions.get(event_type, f"Who's excited about {title}? What are you looking forward to most?")
    
    def _create_urgency_variant(self, content: str, event_data: Dict[str, Any]) -> str:
        """Create a variant that emphasizes urgency"""
        
        title = event_data.get('title', 'Event')
        date = self._format_event_date(event_data.get('start_date'))
        
        urgency_phrases = [
            "Limited spots available!",
            "Don't miss out!",
            "Register now!",
            "Early bird pricing ends soon!",
            "Spaces filling fast!"
        ]
        
        import random
        urgency = random.choice(urgency_phrases)
        
        return f"⏰ {urgency} {title} is coming up on {date}. Secure your spot today before it's too late! 🎯"
    
    def _get_engagement_tips(self, platform: str) -> List[str]:
        """Get platform-specific engagement tips"""
        
        tips = {
            'instagram': [
                "Post during peak hours (6-9 PM on weekdays)",
                "Use Instagram Stories for behind-the-scenes content",
                "Encourage photo sharing with a branded hashtag",
                "Respond to comments within the first hour",
                "Consider creating a Reel for maximum reach"
            ],
            'linkedin': [
                "Post during business hours (9 AM - 5 PM, Tue-Thu)",
                "Engage with comments professionally and promptly",
                "Share to relevant LinkedIn groups",
                "Tag speakers or key participants",
                "Follow up with attendee connections post-event"
            ],
            'twitter': [
                "Tweet during high engagement times (12-3 PM, 5-6 PM)",
                "Create a thread for more detailed information",
                "Retweet with additional comments",
                "Use trending hashtags when relevant",
                "Pin the tweet to your profile for visibility"
            ],
            'facebook': [
                "Post during peak engagement (1-4 PM on weekdays)",
                "Create a Facebook event for better organization",
                "Encourage event sharing in relevant groups",
                "Use Facebook Live for real-time updates",
                "Post in local community groups"
            ]
        }
        
        return tips.get(platform, [])
    
    def _generate_fallback_content(self, platform: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback content when AI generation fails"""
        
        title = event_data.get('title', 'Event')
        date = self._format_event_date(event_data.get('start_date'))
        location = event_data.get('location', {})
        
        if location.get('is_online'):
            location_str = 'Online'
        else:
            location_str = location.get('name', 'Location TBD')
        
        fallback_content = {
            'instagram': {
                'main_content': f"🎉 Join us for {title}! 📅 {date} 📍 {location_str}\n\nDon't miss this amazing event! ✨",
                'hashtags': ['#UnitedItalianSocieties', '#Community', '#Event', '#ItalianCulture'],
                'call_to_action': 'Register now!',
                'posting_time': '6:00 PM on weekdays'
            },
            'linkedin': {
                'main_content': f"We're excited to announce {title} on {date} at {location_str}. Join our community for this special event.",
                'hashtags': ['#Community', '#Networking', '#ItalianHeritage'],
                'call_to_action': 'Register today',
                'posting_time': '9:00 AM on Tuesday-Thursday'
            },
            'twitter': {
                'main_content': f"🎉 {title} - {date} at {location_str}! Join us!",
                'hashtags': ['#UIS', '#Community'],
                'call_to_action': 'Register now!',
                'posting_time': '12:00 PM or 5:00 PM on weekdays'
            },
            'facebook': {
                'main_content': f"Mark your calendars! {title} is happening on {date} at {location_str}. We'd love to see you there!",
                'hashtags': ['#UnitedItalianSocieties', '#Community', '#Event'],
                'call_to_action': 'Let us know if you\'re coming!',
                'posting_time': '1:00 PM on weekdays'
            }
        }
        
        base_content = fallback_content.get(platform, fallback_content['facebook'])
        
        return {
            'platform': platform,
            'main_content': base_content['main_content'],
            'hashtags': base_content['hashtags'],
            'call_to_action': base_content['call_to_action'],
            'posting_time': base_content['posting_time'],
            'character_count': len(base_content['main_content']),
            'variants': [],
            'engagement_tips': self._get_engagement_tips(platform),
            'created_at': datetime.utcnow().isoformat(),
            'type': 'fallback',
            'message': 'Generated using fallback template due to AI generation failure'
        }
    
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