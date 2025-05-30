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
    
    COMMUNITY_TEMPLATE = (
        "Ciao ragazzi!\\n\\n"
        "🇮🇹 {collaboration_prefix}United Italian Societies invites you to {event_name}! 🎉\\n\\n"
        "Join us for {short_description_of_event}. We've booked {special_details}, with good vibes and {highlight_of_the_event}.\\n\\n"
        "📅 {event_date}\\n"
        "⏰ {event_time}\\n"
        "📍 {venue_name}, {venue_address}\\n"
        "🎟️ {ticket_info}\\n\\n"
        "Tickets are limited—grab yours now and don't miss out! 🎶🇮🇹\\n"
        "👉 Tickets: {ticket_link}\\n\\n"
        "💡 Don't forget your government ID.\\n"
        "{optional_note_about_dress_code_or_other}"
    )

    SPEAKER_TEMPLATE = (
        "Ciao ragazzi!\\n\\n"
        "🇮🇹 {collaboration_prefix}United Italian Societies is honoured to present {event_name}! 🎓\\n\\n"
        "Join us for {short_description_of_event}. {highlight_of_the_event}.\\n\\n"
        "📅 {event_date}\\n"
        "⏰ {event_time}\\n"
        "📍 {venue_name}, {venue_address}\\n\\n"
        "Spots are limited—reserve yours now and don't miss out! 🇮🇹\\n"
        "👉 Register here: {registration_link}\\n\\n"
        "{optional_note_about_dress_code_or_other}"
    )

    def __init__(self):
        self.settings = get_settings()
    
    async def initialize(self):
        """Initialize the WhatsApp Agent"""
        logger.info("Initializing WhatsApp Agent...")
        logger.info("✅ WhatsApp Agent initialized successfully")
    
    def _select_template(self, event_type: Optional[str]) -> str:
        """Selects the appropriate WhatsApp template based on the event type."""
        event_type_upper = event_type.upper() if event_type else "COMMUNITY" # Default
        
        if event_type_upper in ["SPEAKER", "EDUCATIONAL"]:
            return self.SPEAKER_TEMPLATE
        # Default to COMMUNITY_TEMPLATE for COMMUNITY, NETWORKING, CULTURAL, SOCIAL, and others.
        return self.COMMUNITY_TEMPLATE

    async def generate_message(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any], # Kept for potential future use (e.g., tone preference)
        llm: ChatOpenAI
    ) -> Dict[str, Any]: # Returns { 'whatsapp_message_text': str | None, 'error': str | None }
        """Generate a WhatsApp message by filling a template with event details using an LLM."""
        
        event_title = event_data.get('title', 'Untitled Event')
        logger.info(f"Generating WhatsApp message for event: {event_title}.")
        
        try:
            selected_template = self._select_template(event_data.get('event_type'))
            
            prompt = self._build_whatsapp_prompt(event_data, preferences, selected_template)
            
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            generated_text = response.content.strip()

            if not generated_text:
                logger.error(f"LLM returned empty message for event {event_title}.")
                return {'whatsapp_message_text': None, 'error': "LLM returned an empty message."}
            
            # Basic cleanup - LLM might sometimes add quotes around the message
            if generated_text.startswith('"') and generated_text.endswith('"'):
                generated_text = generated_text[1:-1]
            
            logger.info(f"✅ WhatsApp message generated successfully for event {event_title}.")
            return {'whatsapp_message_text': generated_text, 'error': None}
            
        except Exception as e:
            logger.error(f"❌ WhatsApp message generation failed for event {event_title}: {e}", exc_info=True)
            return {'whatsapp_message_text': None, 'error': str(e)}
    
    def _build_whatsapp_prompt(
        self,
        event_data: Dict[str, Any],
        preferences: Dict[str, Any],
        template_string: str # This is the selected template string
    ) -> str:
        """Builds a prompt for the LLM to fill a WhatsApp template with event details."""
        
        # --- Prepare data for the prompt ---
        title = event_data.get('title', '[Event Title Missing]')
        description = event_data.get('description', '') # LLM will be asked to make a short version for the template
        event_type_str = event_data.get('event_type', 'Unknown Event Type')
        start_date_iso = event_data.get('start_date')
        
        event_date_formatted = self._format_event_date(start_date_iso)
        event_time_formatted = self._format_event_time(start_date_iso)
        
        loc = event_data.get('location', {})
        venue_name_str = loc.get('name', '[Venue Name Missing]')
        venue_address_str = loc.get('address', '[Address Missing]')
        if loc.get('is_online'):
            venue_name_str = "Online Event"
            venue_address_str = loc.get('meeting_link', '[Online Link TBD]')

        # Ticket Info construction for the prompt
        ti = event_data.get('ticket_info', {})
        ticket_price_str = ""
        if ti.get('is_free'):
            ticket_price_str = "Free"
        elif ti.get('price') is not None:
            ticket_price_str = f"{ti.get('currency', '£')}{ti.get('price')}"
        else:
            ticket_price_str = "Ticket details TBD"
        
        if ti.get('registration_required'):
            ticket_price_str += " (Registration Required)"

        # Links (to be improved with dedicated fields from event_data later)
        # For now, we can use meeting_link if online, or prompt LLM to note if missing
        ticket_or_reg_link_str = event_data.get('registration_link') or event_data.get('ticket_purchase_url') or \
                                 (loc.get('meeting_link') if loc.get('is_online') else '[Link/Info TBD]')

        # Collaboration Prefix
        collaboration_prefix_str = ""
        if event_data.get('is_collaboration') and event_data.get('collaborating_organizations'):
            org_names = ", ".join(event_data['collaborating_organizations'])
            collaboration_prefix_str = f"in collaboration with {org_names}, " # Note the trailing space

        # Placeholder data for currently unmapped fields - LLM will be instructed on how to handle
        # special_details_str = event_data.get('special_details', '') # Example, if added to event_data
        # highlight_of_event_str = event_data.get('highlight_of_event', '') # Example
        # optional_note_str = event_data.get('optional_note', '') # Example

        # The template string itself will contain {collaboration_prefix} which the LLM will fill (or leave if empty)
        
        prompt = f"""
        You are an AI assistant for United Italian Societies (UIS). Your task is to generate a WhatsApp message.
        You will be given:
        1. Event Details.
        2. A WhatsApp message template that includes placeholders like {{event_name}}, {{short_description_of_event}}, etc., and also a {{collaboration_prefix}} placeholder.

        Your instructions are:
        1.  Use the 'Collaboration Prefix' from event details to fill {{collaboration_prefix}} in the template. If it's empty, the prefix part of the template will be empty.
        2.  Fill all other placeholders (e.g., {{event_name}}, {{event_date}}) in the template using the corresponding 'Event Details'.
        3.  For {{short_description_of_event}}, create a concise summary from the main 'Event Description' suitable for a brief mention in the message.
        4.  For template placeholders like {{special_details}}, {{highlight_of_the_event}}, and {{optional_note_about_dress_code_or_other}}:
            *   Try to infer appropriate content from the main 'Event Description'.
            *   If no relevant information can be inferred for these, you can either omit the part of the sentence that uses them, or use a generic but relevant phrase (e.g., for {{special_details}}, you could say "a fantastic atmosphere").
            *   For {{optional_note_about_dress_code_or_other}}, if there's no specific note in Event Details, simply omit this line entirely.
        5.  After filling the template, review the entire message. Make minor tweaks ONLY IF ABSOLUTELY NECESSARY for clarity, natural flow, and a friendly, engaging WhatsApp tone suitable for a community organization. Do NOT change the core structure or emojis from the template unless critically needed for coherence.
        6.  The final output MUST be ONLY the WhatsApp message text, ready to be copied and pasted. No explanations, headers, or conversational text.

        EVENT DETAILS:
        - Event Name: {title}
        - Event Type: {event_type_str}
        - Full Event Description: {description}
        - Event Date Formatted: {event_date_formatted}
        - Event Time Formatted: {event_time_formatted}
        - Venue Name: {venue_name_str}
        - Venue Address/Link: {venue_address_str}
        - Ticket Information Summary: {ticket_price_str}
        - Ticket/Registration Link: {ticket_or_reg_link_str}
        - Collaboration Prefix: "{collaboration_prefix_str}" (Use this to fill {{collaboration_prefix}} in the template. If empty, the prefix in template becomes empty.)
        - (If available, other details like 'Special Details Text', 'Highlight of Event Text', 'Optional Notes Text' would be here. Since they are not explicitly provided in this list, you should rely on the 'Full Event Description' for inference for placeholders like {{special_details}}, {{highlight_of_the_event}}, etc., or omit if not inferable/relevant.)

        WHATSAPP MESSAGE TEMPLATE TO FILL:
        --- START TEMPLATE ---
        {template_string}
        --- END TEMPLATE ---

        Based on the event details and the template, generate the FINAL WHATSAPP MESSAGE TEXT:
        """
        return prompt

    # Helper methods for date/time formatting (can be kept or moved to a utility class)
    def _format_event_date(self, date_str: Optional[str]) -> str:
        if not date_str:
            return '[Date TBD]'
        try:
            dt_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt_obj.strftime('%A, %B %d, %Y') # e.g., Friday, May 30, 2025
        except ValueError:
            logger.warning(f"Could not parse date: {date_str}. Returning as is or TBD.")
            # Try to format just the date part if time is malformed or missing
            try:
                dt_obj = datetime.fromisoformat(date_str.split('T')[0])
                return dt_obj.strftime('%A, %B %d, %Y')
            except: 
                return date_str if date_str else '[Date TBD]'

    def _format_event_time(self, date_str: Optional[str]) -> str:
        if not date_str:
            return '[Time TBD]'
        try:
            dt_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt_obj.strftime('%I:%M %p %Z') # e.g., 10:00 AM UTC
        except ValueError:
            logger.warning(f"Could not parse time from date: {date_str}. Returning as TBD.")
            return '[Time TBD]'

    # Remove or comment out all other methods from the original agent:
    # _generate_main_message, _build_message_prompt (old one), _format_whatsapp_message (old one),
    # _optimize_line_breaks, _truncate_message, _extract_message_components, 
    # _estimate_read_time, _get_best_send_time, _get_formatting_tips,
    # _generate_message_variations and its sub-methods (_create_short_variation, etc.)
    # _generate_broadcast_suggestions, _generate_follow_up_messages, _generate_fallback_message

    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up WhatsApp Agent...")
        logger.info("✅ WhatsApp Agent cleanup completed")

# Example usage (for testing, would be called by orchestrator):
# async def main_test():
#     agent = WhatsAppAgent()
#     await agent.initialize()
#     llm = ChatOpenAI(
#         model=get_settings().openrouter_model,
#         api_key=get_settings().openrouter_api_key,
#         base_url="https://openrouter.ai/api/v1"
#     )
#     event_data_sample = {
#         'title': 'Italian Movie Night',
#         'description': 'Join us for a screening of a classic Italian film with popcorn and friends!',
#         'start_date': '2025-07-15T19:00:00Z',
#         'location': {'name': 'Community Hall', 'address': '123 Main St'}
#     }
#     preferences_sample = {}
#     # template_sample is no longer passed to generate_message
#     result = await agent.generate_message(event_data_sample, preferences_sample, llm)
#     if result['error']:
#         print(f"Error: {result['error']}")
#     else:
#         print("--- Generated WhatsApp Message ---")
#         print(result['whatsapp_message_text'])

# if __name__ == '__main__':
#     asyncio.run(main_test())