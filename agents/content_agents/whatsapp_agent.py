# =============================================================================
# agents/content_agents/whatsapp_agent.py - WhatsApp Message Generation Agent
# =============================================================================

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class WhatsAppAgent:
    """Agent for generating WhatsApp broadcast messages and community communications"""
    
    def __init__(self):
        self.settings = get_settings()
        self.message_types = {
            'announcement': {
                'max_length': 1000,
                'tone': 'informative',
                'emoji_usage': 'moderate',
                'format': 'structured'
            },
            'invitation': {
                'max_length': 800,
                'tone': 'friendly',
                'emoji_usage': 'high',
                'format': 'personal'
            },
            'reminder': {
                'max_length': 600,
                'tone': 'urgent',
                'emoji_usage': 'moderate',
                'format': 'concise'
            },
            'update': {
                'max_length': 800,
                'tone': 'informative',
                'emoji_usage': 'low',
                'format': 'bullet_points'
            }
        }
    
    async def initialize(self):
        """Initialize the WhatsApp Agent"""
        logger.info("Initializing WhatsApp Agent...")
        logger.info("✅ WhatsApp Agent initialized successfully")
    
    async def generate_message(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate WhatsApp broadcast message for event"""
        
        logger.info(f"Generating WhatsApp message for event: {event_data.get('title', 'Untitled')}")
        
        try:
            # Determine message type
            message_type = preferences.get('whatsapp_message_type', 'invitation')
            
            # Generate main message
            main_message = await self._generate_main_message(
                event_data, preferences, message_type, llm
            )
            
            # Generate broadcast variations
            variations = await self._generate_message_variations(
                main_message, event_data, preferences, llm
            )
            
            # Generate broadcast list suggestions
            broadcast_suggestions = self._generate_broadcast_suggestions(
                event_data, preferences
            )
            
            # Generate follow-up messages
            follow_ups = self._generate_follow_up_messages(event_data, preferences)
            
            result = {
                'message': main_message,
                'variations': variations,
                'broadcast_suggestions': broadcast_suggestions,
                'follow_up_messages': follow_ups,
                'message_type': message_type,
                'character_count': len(main_message.get('content', '')),
                'created_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ WhatsApp message generated successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ WhatsApp message generation failed: {e}")
            return {
                'error': str(e),
                'fallback_message': self._generate_fallback_message(event_data, preferences)
            }
    
    async def _generate_main_message(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        message_type: str,
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Generate the main WhatsApp message"""
        
        # Build message prompt
        prompt = self._build_message_prompt(event_data, preferences, message_type)
        
        try:
            # Generate message using LLM
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            raw_message = response.content
            
            # Format and structure the message
            formatted_message = self._format_whatsapp_message(
                raw_message, event_data, message_type
            )
            
            return formatted_message
            
        except Exception as e:
            logger.error(f"Failed to generate main WhatsApp message: {e}")
            return self._generate_fallback_message(event_data, preferences)
    
    def _build_message_prompt(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        message_type: str
    ) -> str:
        """Build prompt for WhatsApp message generation"""
        
        # Extract event details
        title = event_data.get('title', 'Event')
        description = event_data.get('description', '')
        date = self._format_event_date(event_data.get('start_date'))
        time = self._format_event_time(event_data.get('start_date'))
        location = event_data.get('location', {})
        event_type = event_data.get('event_type', 'community')
        
        # Get location string
        if location.get('is_online'):
            location_str = '💻 Online Event'
            location_details = location.get('meeting_url', 'Meeting link will be shared')
        else:
            location_str = f"📍 {location.get('name', 'Location TBD')}"
            location_details = location.get('address', 'Address details will be shared')
        
        # Get preferences
        target_audience = preferences.get('target_audience', ['community-members'])
        tone = preferences.get('tone', 'friendly')
        include_rsvp = preferences.get('include_rsvp', True)
        
        # Message type specific instructions
        type_config = self.message_types.get(message_type, self.message_types['invitation'])
        
        type_instructions = {
            'announcement': """
Create a formal announcement message that:
- Clearly states the event details upfront
- Uses a professional yet warm tone
- Includes all essential information
- Has a clear structure with sections
- Ends with contact information
""",
            'invitation': """
Create a personal invitation message that:
- Feels like a friend inviting you to something special
- Uses emojis to make it visually appealing
- Creates excitement and anticipation
- Includes a warm, personal touch
- Has a friendly call-to-action
""",
            'reminder': """
Create a reminder message that:
- Has urgency without being pushy
- Highlights key details quickly
- Uses time-sensitive language
- Is concise and scannable
- Includes next steps clearly
""",
            'update': """
Create an update message that:
- Provides new or changed information clearly
- Uses bullet points for easy reading
- Highlights what's different or new
- Maintains an informative tone
- Includes relevant next steps
"""
        }
        
        return f"""
        Create a WhatsApp broadcast message for {message_type.upper()} with these requirements:

        EVENT DETAILS:
        - Title: {title}
        - Type: {event_type}
        - Date: {date}
        - Time: {time}
        - Location: {location_str}
        - Location Details: {location_details}
        - Description: {description[:150]}...

        MESSAGE REQUIREMENTS:
        - Message Type: {message_type}
        - Maximum Length: {type_config['max_length']} characters
        - Tone: {type_config['tone']} and {tone}
        - Emoji Usage: {type_config['emoji_usage']}
        - Format Style: {type_config['format']}
        - Target Audience: {', '.join(target_audience)}
        - Include RSVP: {'Yes' if include_rsvp else 'No'}

        {type_instructions.get(message_type, '')}

        ORGANIZATION CONTEXT:
        This is for United Italian Societies (UIS), a warm community celebrating Italian heritage and culture.

        WHATSAPP BEST PRACTICES:
        - Use line breaks for readability
        - Include relevant emojis but don't overdo it
        - Make it personal and conversational
        - Include a clear call-to-action
        - End with contact information or next steps

        Please provide a complete WhatsApp message that feels authentic and engaging.
        Format the message exactly as it would appear in WhatsApp, with proper line breaks and emoji placement.
        """
    
    def _format_whatsapp_message(
        self,
        raw_message: str,
        event_data: Dict[str, Any],
        message_type: str
    ) -> Dict[str, Any]:
        """Format and structure the WhatsApp message"""
        
        try:
            # Clean up the message
            formatted_content = raw_message.strip()
            
            # Ensure proper line breaks for WhatsApp
            formatted_content = self._optimize_line_breaks(formatted_content)
            
            # Validate message length
            type_config = self.message_types.get(message_type, self.message_types['invitation'])
            if len(formatted_content) > type_config['max_length']:
                formatted_content = self._truncate_message(formatted_content, type_config['max_length'])
            
            # Extract key components
            components = self._extract_message_components(formatted_content)
            
            return {
                'content': formatted_content,
                'components': components,
                'message_type': message_type,
                'character_count': len(formatted_content),
                'line_count': len(formatted_content.split('\n')),
                'estimated_read_time': self._estimate_read_time(formatted_content),
                'best_send_time': self._get_best_send_time(message_type),
                'formatting_tips': self._get_formatting_tips()
            }
            
        except Exception as e:
            logger.error(f"Failed to format WhatsApp message: {e}")
            return self._generate_fallback_message(event_data, {})
    
    def _optimize_line_breaks(self, content: str) -> str:
        """Optimize line breaks for WhatsApp readability"""
        
        # Replace multiple consecutive line breaks with double line breaks
        import re
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Ensure emojis at start of lines have proper spacing
        lines = content.split('\n')
        optimized_lines = []
        
        for line in lines:
            line = line.strip()
            if line:
                # Add space after emoji if it's at the start
                if len(line) > 0 and ord(line[0]) > 127:  # Unicode emoji check
                    if len(line) > 1 and line[1] != ' ':
                        line = line[0] + ' ' + line[1:]
                optimized_lines.append(line)
            else:
                optimized_lines.append('')
        
        return '\n'.join(optimized_lines)
    
    def _truncate_message(self, content: str, max_length: int) -> str:
        """Truncate message while preserving structure"""
        
        if len(content) <= max_length:
            return content
        
        # Try to truncate at a natural break point
        lines = content.split('\n')
        truncated_lines = []
        current_length = 0
        
        for line in lines:
            if current_length + len(line) + 1 <= max_length - 20:  # Leave room for "..."
                truncated_lines.append(line)
                current_length += len(line) + 1
            else:
                break
        
        truncated_content = '\n'.join(truncated_lines)
        
        # Add continuation indicator
        if current_length < len(content):
            truncated_content += '\n\n...(message continues)'
        
        return truncated_content
    
    def _extract_message_components(self, content: str) -> Dict[str, str]:
        """Extract key components from the message"""
        
        components = {
            'greeting': '',
            'event_details': '',
            'call_to_action': '',
            'contact_info': '',
            'emojis_used': []
        }
        
        lines = content.split('\n')
        
        # Simple extraction logic
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            # First non-empty line might be greeting
            if i == 0 or (i == 1 and not lines[0].strip()):
                components['greeting'] = line
            
            # Lines with RSVP, contact, reply might be call-to-action
            if any(word in line.lower() for word in ['rsvp', 'reply', 'contact', 'call', 'message']):
                components['call_to_action'] = line
            
            # Lines with phone numbers or email might be contact info
            if any(char in line for char in ['@', '(', ')', '-']) and any(word in line.lower() for word in ['contact', 'info', 'call', 'email']):
                components['contact_info'] = line
            
            # Extract emojis
            import re
            emojis = re.findall(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002700-\U000027BF\U0001F900-\U0001F9FF\U0001F018-\U0001F270]', line)
            components['emojis_used'].extend(emojis)
        
        # Remove duplicates from emojis
        components['emojis_used'] = list(set(components['emojis_used']))
        
        return components
    
    def _estimate_read_time(self, content: str) -> int:
        """Estimate reading time in seconds"""
        
        # Average reading speed: 200-250 words per minute
        # WhatsApp messages are read faster, so use higher speed
        words = len(content.split())
        return max(int((words / 300) * 60), 10)  # Minimum 10 seconds
    
    def _get_best_send_time(self, message_type: str) -> Dict[str, str]:
        """Get best sending time recommendations"""
        
        recommendations = {
            'announcement': {
                'weekday': '9:00 AM - 11:00 AM or 2:00 PM - 4:00 PM',
                'weekend': '10:00 AM - 12:00 PM',
                'reasoning': 'Business hours for formal announcements'
            },
            'invitation': {
                'weekday': '6:00 PM - 8:00 PM',
                'weekend': '11:00 AM - 1:00 PM or 4:00 PM - 6:00 PM',
                'reasoning': 'After work hours when people check personal messages'
            },
            'reminder': {
                'weekday': '8:00 AM - 9:00 AM or 5:00 PM - 6:00 PM',
                'weekend': '9:00 AM - 10:00 AM',
                'reasoning': 'Times when people actively check messages'
            },
            'update': {
                'weekday': '12:00 PM - 1:00 PM or 3:00 PM - 4:00 PM',
                'weekend': '2:00 PM - 4:00 PM',
                'reasoning': 'Midday when people have time to read updates'
            }
        }
        
        return recommendations.get(message_type, recommendations['invitation'])
    
    def _get_formatting_tips(self) -> List[str]:
        """Get WhatsApp formatting tips"""
        
        return [
            "Use *bold* for important information",
            "Use _italics_ for emphasis",
            "Use ~strikethrough~ for corrections",
            "Use ```code``` for formatted text blocks",
            "Keep paragraphs short for mobile reading",
            "Use emojis to break up text visually",
            "Test message appearance on different devices"
        ]
    
    async def _generate_message_variations(
        self,
        main_message: Dict[str, Any],
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> List[Dict[str, Any]]:
        """Generate variations of the main message"""
        
        variations = []
        
        try:
            # Variation 1: Short version
            short_variation = await self._create_short_variation(main_message, event_data, llm)
            variations.append(short_variation)
            
            # Variation 2: Detailed version
            detailed_variation = await self._create_detailed_variation(main_message, event_data, llm)
            variations.append(detailed_variation)
            
            # Variation 3: Different tone
            tone_variation = await self._create_tone_variation(main_message, event_data, preferences, llm)
            variations.append(tone_variation)
            
        except Exception as e:
            logger.error(f"Failed to generate message variations: {e}")
        
        return variations
    
    async def _create_short_variation(
        self,
        main_message: Dict[str, Any],
        event_data: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Create a shorter version of the message"""
        
        title = event_data.get('title', 'Event')
        date = self._format_event_date(event_data.get('start_date'))
        location = event_data.get('location', {})
        
        if location.get('is_online'):
            location_str = 'Online'
        else:
            location_str = location.get('name', 'Location TBD')
        
        short_content = f"""🎉 *{title}*

📅 {date}
📍 {location_str}

Join us for this special event!

RSVP: Reply to this message

#UnitedItalianSocieties"""
        
        return {
            'type': 'short',
            'content': short_content,
            'character_count': len(short_content),
            'description': 'Concise version with essential details only'
        }
    
    async def _create_detailed_variation(
        self,
        main_message: Dict[str, Any],
        event_data: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Create a more detailed version of the message"""
        
        try:
            prompt = f"""
            Create a detailed WhatsApp message based on this event information:
            
            Event Title: {event_data.get('title', 'Event')}
            Description: {event_data.get('description', '')}
            Date: {self._format_event_date(event_data.get('start_date'))}
            Location: {event_data.get('location', {}).get('name', 'Location TBD')}
            
            Make it comprehensive but still appropriate for WhatsApp. Include:
            - Detailed event description
            - What attendees can expect
            - Any special features or highlights
            - Clear next steps
            
            Keep it under 1200 characters and use WhatsApp formatting.
            """
            
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            detailed_content = response.content.strip()
            
            return {
                'type': 'detailed',
                'content': detailed_content,
                'character_count': len(detailed_content),
                'description': 'Comprehensive version with full event details'
            }
            
        except Exception as e:
            logger.error(f"Failed to create detailed variation: {e}")
            return {
                'type': 'detailed',
                'content': main_message.get('content', ''),
                'character_count': len(main_message.get('content', '')),
                'description': 'Fallback - using main message'
            }
    
    async def _create_tone_variation(
        self,
        main_message: Dict[str, Any],
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        llm: ChatOpenAI
    ) -> Dict[str, Any]:
        """Create a variation with different tone"""
        
        current_tone = preferences.get('tone', 'friendly')
        
        # Choose alternative tone
        tone_alternatives = {
            'friendly': 'professional',
            'professional': 'casual',
            'casual': 'enthusiastic',
            'enthusiastic': 'friendly'
        }
        
        alt_tone = tone_alternatives.get(current_tone, 'enthusiastic')
        
        try:
            prompt = f"""
            Rewrite this WhatsApp message with a {alt_tone} tone:
            
            Original message: {main_message.get('content', '')}
            
            Event: {event_data.get('title', 'Event')}
            
            Make it sound {alt_tone} while keeping all the essential information.
            Use appropriate emojis and formatting for the {alt_tone} tone.
            """
            
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            tone_content = response.content.strip()
            
            return {
                'type': f'{alt_tone}_tone',
                'content': tone_content,
                'character_count': len(tone_content),
                'description': f'Alternative version with {alt_tone} tone'
            }
            
        except Exception as e:
            logger.error(f"Failed to create tone variation: {e}")
            return {
                'type': f'{alt_tone}_tone',
                'content': main_message.get('content', ''),
                'character_count': len(main_message.get('content', '')),
                'description': f'Fallback - using main message'
            }
    
    def _generate_broadcast_suggestions(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate suggestions for WhatsApp broadcast lists"""
        
        event_type = event_data.get('event_type', 'community')
        target_audience = preferences.get('target_audience', ['community-members'])
        
        # Suggested broadcast lists based on event type and audience
        broadcast_lists = {
            'cultural': [
                'UIS Cultural Events',
                'Italian Heritage Group',
                'Cultural Committee Members',
                'Previous Cultural Event Attendees'
            ],
            'social': [
                'UIS Social Events',
                'Community Members',
                'Family Events Group',
                'Social Committee'
            ],
            'educational': [
                'UIS Educational Events',
                'Workshop Participants',
                'Learning & Development Group',
                'Professional Development'
            ],
            'fundraiser': [
                'UIS Fundraising Events',
                'Donors & Supporters',
                'Community Leaders',
                'Board Members'
            ],
            'community': [
                'UIS All Members',
                'Community Events',
                'General Announcements',
                'Active Participants'
            ]
        }
        
        suggested_lists = broadcast_lists.get(event_type, broadcast_lists['community'])
        
        # Audience-specific additions
        if 'families' in target_audience:
            suggested_lists.append('Family-Friendly Events')
        if 'seniors' in target_audience:
            suggested_lists.append('Senior Community Members')
        if 'young-professionals' in target_audience:
            suggested_lists.append('Young Professionals Network')
        
        return {
            'primary_lists': suggested_lists[:3],
            'secondary_lists': suggested_lists[3:],
            'timing_recommendations': {
                'initial_send': 'Send to primary lists first',
                'follow_up': 'Send to secondary lists 2-3 hours later',
                'reminder': 'Send reminder 24-48 hours before event'
            },
            'personalization_tips': [
                'Mention recipient\'s previous participation if applicable',
                'Reference their interests or involvement',
                'Add personal note for VIP contacts',
                'Use recipient\'s preferred language if known'
            ]
        }
    
    def _generate_follow_up_messages(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        """Generate follow-up message templates"""
        
        title = event_data.get('title', 'Event')
        date = self._format_event_date(event_data.get('start_date'))
        
        follow_ups = {
            'reminder_24h': [
                f"⏰ *Reminder: {title}*\n\nJust 24 hours to go! Don't forget about tomorrow's event.\n\n📅 {date}\n\nSee you there! 🎉",
                f"🔔 Quick reminder about {title} tomorrow!\n\nWe're excited to see you there. Any last-minute questions?\n\nReply if you need directions or details! 📍"
            ],
            'reminder_2h': [
                f"🚨 *{title} starts in 2 hours!*\n\nHope you're ready for a great time!\n\nSee you soon! ✨",
                f"⏰ Starting soon: {title}\n\n2 hours to go! Final preparations are underway.\n\nCan't wait to see everyone! 🎊"
            ],
            'thank_you': [
                f"🙏 *Thank you for joining {title}!*\n\nIt was wonderful having you there. Hope you enjoyed the event!\n\nStay tuned for more upcoming events! 📅",
                f"✨ What an amazing {title}!\n\nThank you to everyone who participated. Your presence made it special!\n\nPhotos and updates coming soon! 📸"
            ],
            'missed_you': [
                f"😢 We missed you at {title}!\n\nHope everything is okay. The event was fantastic!\n\nWe'll share updates and photos soon. Next time! 🤗",
                f"💭 Sorry you couldn't make it to {title}\n\nWe had a great time and thought of you. Keep an eye out for our next event!\n\nHope to see you then! 🎉"
            ]
        }
        
        return follow_ups
    
    def _generate_fallback_message(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate fallback message when AI generation fails"""
        
        title = event_data.get('title', 'Event')
        date = self._format_event_date(event_data.get('start_date'))
        time = self._format_event_time(event_data.get('start_date'))
        location = event_data.get('location', {})
        
        if location.get('is_online'):
            location_str = '💻 Online Event'
        else:
            location_str = f"📍 {location.get('name', 'Location TBD')}"
        
        fallback_content = f"""🎉 *{title}*

You're invited to join us for this special event!

📅 *When:* {date}
🕐 *Time:* {time}
{location_str}

We'd love to see you there! This promises to be a wonderful gathering for our community.

*RSVP:* Please reply to this message to confirm your attendance.

*Questions?* Feel free to reach out!

Looking forward to seeing you!

#UnitedItalianSocieties 🇮🇹"""
        
        return {
            'content': fallback_content,
            'components': {
                'greeting': '🎉 *{title}*',
                'event_details': f'{date} at {location_str}',
                'call_to_action': 'Please reply to this message to confirm',
                'contact_info': 'Feel free to reach out!',
                'emojis_used': ['🎉', '📅', '🕐', '📍', '🇮🇹']
            },
            'message_type': 'invitation',
            'character_count': len(fallback_content),
            'line_count': len(fallback_content.split('\n')),
            'estimated_read_time': self._estimate_read_time(fallback_content),
            'best_send_time': self._get_best_send_time('invitation'),
            'formatting_tips': self._get_formatting_tips(),
            'type': 'fallback',
            'message': 'Generated using fallback template due to AI generation failure'
        }
    
    def _format_event_date(self, date_str: Optional[str]) -> str:
        """Format event date for display"""
        
        if not date_str:
            return 'Date TBD'
        
        try:
            from datetime import datetime
            
            formats = [
                '%Y-%m-%d',
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f'
            ]
            
            for fmt in formats:
                try:
                    date_obj = datetime.strptime(date_str.split('T')[0] if 'T' in date_str else date_str, fmt.split('T')[0] if 'T' in fmt else fmt)
                    return date_obj.strftime('%A, %B %d, %Y')
                except ValueError:
                    continue
            
            return date_str
            
        except Exception as e:
            logger.error(f"Failed to format date {date_str}: {e}")
            return date_str or 'Date TBD'
    
    def _format_event_time(self, date_str: Optional[str]) -> str:
        """Format event time for display"""
        
        if not date_str or 'T' not in date_str:
            return 'Time TBD'
        
        try:
            from datetime import datetime
            
            # Parse full datetime
            formats = [
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f'
            ]
            
            for fmt in formats:
                try:
                    date_obj = datetime.strptime(date_str, fmt)
                    return date_obj.strftime('%I:%M %p')
                except ValueError:
                    continue
            
            return 'Time TBD'
            
        except Exception as e:
            logger.error(f"Failed to format time {date_str}: {e}")
            return 'Time TBD'
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up WhatsApp Agent...")
        logger.info("✅ WhatsApp Agent cleanup completed")