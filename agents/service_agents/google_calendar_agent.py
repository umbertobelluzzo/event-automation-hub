# =============================================================================
# agents/service_agents/google_calendar_agent.py - Google Calendar Integration Agent
# =============================================================================

import asyncio
import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class GoogleCalendarAgent:
    """Agent for Google Calendar event creation and management"""
    
    def __init__(self):
        self.settings = get_settings()
        self.service = None
        self.credentials = None
        self.scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events'
        ]
    
    async def initialize(self):
        """Initialize the Google Calendar Agent"""
        logger.info("Initializing Google Calendar Agent...")
        
        try:
            # Initialize Google Calendar API service
            await self._setup_credentials()
            await self._build_service()
            
            # Test connection
            if await self._test_connection():
                logger.info("✅ Google Calendar Agent initialized successfully")
            else:
                logger.warning("⚠️ Google Calendar Agent initialized but connection test failed")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Calendar Agent: {e}")
            # Don't raise - allow system to continue without Calendar integration
    
    async def _setup_credentials(self):
        """Setup Google Calendar API credentials"""
        
        try:
            # Try to load existing credentials
            creds_path = self.settings.google_credentials_path
            if creds_path and os.path.exists(creds_path):
                with open(creds_path, 'r') as f:
                    creds_info = json.load(f)
                    self.credentials = Credentials.from_authorized_user_info(creds_info, self.scopes)
            
            # If no valid credentials, use service account or OAuth flow
            if not self.credentials or not self.credentials.valid:
                if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                else:
                    # For production, you'd implement proper OAuth flow
                    # For now, use service account credentials if available
                    service_account_path = self.settings.google_service_account_path
                    if service_account_path and os.path.exists(service_account_path):
                        from google.oauth2 import service_account
                        self.credentials = service_account.Credentials.from_service_account_file(
                            service_account_path, scopes=self.scopes
                        )
                    else:
                        logger.warning("No Google credentials found - Calendar integration will be limited")
                        return
            
        except Exception as e:
            logger.error(f"Failed to setup Google Calendar credentials: {e}")
            raise
    
    async def _build_service(self):
        """Build Google Calendar API service"""
        
        if not self.credentials:
            logger.warning("No credentials available for Google Calendar service")
            return
        
        try:
            self.service = build('calendar', 'v3', credentials=self.credentials)
            logger.info("✅ Google Calendar service built successfully")
            
        except Exception as e:
            logger.error(f"Failed to build Google Calendar service: {e}")
            raise
    
    async def _test_connection(self) -> bool:
        """Test Google Calendar API connection"""
        
        if not self.service:
            return False
        
        try:
            # Try to get calendar list
            calendar_list = self.service.calendarList().list().execute()
            calendars = calendar_list.get('items', [])
            logger.info(f"Connected to Google Calendar - {len(calendars)} calendars available")
            return True
            
        except Exception as e:
            logger.error(f"Google Calendar connection test failed: {e}")
            return False
    
    async def create_event(
        self,
        event_data: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create Google Calendar event"""
        
        logger.info(f"Creating Google Calendar event: {event_data.get('title', 'Untitled')}")
        
        if not self.service:
            logger.warning("Google Calendar service not available")
            return {
                'error': 'Google Calendar service not initialized',
                'fallback_event': self._generate_fallback_event(event_data)
            }
        
        try:
            # Create calendar event
            calendar_event = await self._build_calendar_event(event_data, user_info)
            
            # Insert event into calendar
            created_event = await self._insert_event(calendar_event)
            
            # Add attendees if specified
            if event_data.get('attendees'):
                await self._add_attendees(created_event['id'], event_data.get('attendees', []))
            
            # Set reminders
            await self._set_event_reminders(created_event['id'], event_data)
            
            result = {
                'event_id': created_event['id'],
                'event_url': created_event.get('htmlLink'),
                'calendar_id': created_event.get('organizer', {}).get('email', 'primary'),
                'created_at': created_event.get('created'),
                'event_details': {
                    'title': created_event.get('summary'),
                    'start': created_event.get('start', {}).get('dateTime'),
                    'end': created_event.get('end', {}).get('dateTime'),
                    'location': created_event.get('location'),
                    'description': created_event.get('description')
                },
                'attendees_invited': len(event_data.get('attendees', [])),
                'reminders_set': True
            }
            
            logger.info(f"✅ Google Calendar event created successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ Google Calendar event creation failed: {e}")
            return {
                'error': str(e),
                'fallback_event': self._generate_fallback_event(event_data)
            }
    
    async def _build_calendar_event(
        self,
        event_data: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build calendar event object"""
        
        # Extract event details
        title = event_data.get('title', 'UIS Event')
        description = event_data.get('description', '')
        start_date = event_data.get('start_date')
        end_date = event_data.get('end_date')
        location = event_data.get('location', {})
        
        # Format dates
        start_datetime = self._format_datetime(start_date)
        end_datetime = self._format_datetime(end_date) if end_date else self._calculate_end_time(start_date)
        
        # Build location string
        location_str = self._build_location_string(location)
        
        # Build description with additional details
        full_description = self._build_event_description(event_data, user_info)
        
        # Create calendar event object
        calendar_event = {
            'summary': title,
            'description': full_description,
            'start': start_datetime,
            'end': end_datetime,
            'location': location_str,
            'status': 'confirmed',
            'visibility': 'public',
            'source': {
                'title': 'UIS Event Automation Hub',
                'url': self.settings.frontend_url or 'https://uis-events.com'
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                    {'method': 'popup', 'minutes': 30},       # 30 minutes before
                ]
            },
            'attendees': self._build_attendees_list(event_data.get('attendees', [])),
            'guestsCanInviteOthers': True,
            'guestsCanModify': False,
            'guestsCanSeeOtherGuests': True
        }
        
        # Add recurrence if specified
        if event_data.get('recurrence'):
            calendar_event['recurrence'] = self._build_recurrence_rule(event_data.get('recurrence'))
        
        return calendar_event
    
    def _format_datetime(self, date_str: Optional[str]) -> Dict[str, str]:
        """Format datetime for Google Calendar API"""
        
        if not date_str:
            # Default to next week at 6 PM
            from datetime import datetime, timedelta
            default_date = datetime.now() + timedelta(days=7)
            default_date = default_date.replace(hour=18, minute=0, second=0, microsecond=0)
            date_str = default_date.isoformat()
        
        try:
            # Parse various datetime formats
            formats = [
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%dT%H:%M:%S.%f',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d'
            ]
            
            parsed_date = None
            for fmt in formats:
                try:
                    if 'T' not in date_str and '%Y-%m-%d' == fmt:
                        # Date only - add default time
                        parsed_date = datetime.strptime(date_str, fmt).replace(hour=18, minute=0)
                    else:
                        parsed_date = datetime.strptime(date_str.split('.')[0] if '.' in date_str else date_str, fmt)
                    break
                except ValueError:
                    continue
            
            if not parsed_date:
                # Fallback parsing
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            
            # Return in Google Calendar format
            return {
                'dateTime': parsed_date.isoformat(),
                'timeZone': 'America/New_York'  # Default timezone - should be configurable
            }
            
        except Exception as e:
            logger.error(f"Failed to format datetime {date_str}: {e}")
            # Return a default datetime
            default_date = datetime.now() + timedelta(days=7)
            return {
                'dateTime': default_date.isoformat(),
                'timeZone': 'America/New_York'
            }
    
    def _calculate_end_time(self, start_date_str: Optional[str]) -> Dict[str, str]:
        """Calculate end time if not provided (default 2 hours)"""
        
        try:
            start_dt = self._format_datetime(start_date_str)
            start_datetime = datetime.fromisoformat(start_dt['dateTime'])
            end_datetime = start_datetime + timedelta(hours=2)
            
            return {
                'dateTime': end_datetime.isoformat(),
                'timeZone': start_dt['timeZone']
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate end time: {e}")
            # Default to 2 hours from now
            end_time = datetime.now() + timedelta(hours=2)
            return {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/New_York'
            }
    
    def _build_location_string(self, location: Dict[str, Any]) -> str:
        """Build location string for calendar event"""
        
        if location.get('is_online'):
            meeting_url = location.get('meeting_url', '')
            if meeting_url:
                return f"Online Event - {meeting_url}"
            else:
                return "Online Event - Meeting link to be provided"
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
                return "Location to be determined"
    
    def _build_event_description(
        self,
        event_data: Dict[str, Any],
        user_info: Dict[str, Any]
    ) -> str:
        """Build comprehensive event description"""
        
        description_parts = []
        
        # Main description
        if event_data.get('description'):
            description_parts.append(event_data['description'])
            description_parts.append('')  # Empty line
        
        # Event details
        event_type = event_data.get('event_type', '').title()
        if event_type:
            description_parts.append(f"Event Type: {event_type}")
        
        # Location details
        location = event_data.get('location', {})
        if location.get('is_online'):
            description_parts.append("Format: Online Event")
            if location.get('meeting_url'):
                description_parts.append(f"Meeting Link: {location['meeting_url']}")
        else:
            description_parts.append("Format: In-Person Event")
            if location.get('address'):
                description_parts.append(f"Address: {location['address']}")
        
        # Additional information
        if event_data.get('registration_required'):
            description_parts.append('')
            description_parts.append("⚠️ Registration Required")
            if event_data.get('registration_url'):
                description_parts.append(f"Register at: {event_data['registration_url']}")
        
        # Contact information
        organizer_email = user_info.get('email', '')
        if organizer_email:
            description_parts.append('')
            description_parts.append(f"Contact: {organizer_email}")
        
        # Organization info
        description_parts.extend([
            '',
            '---',
            'Organized by United Italian Societies',
            'Event created by UIS Event Automation Hub'
        ])
        
        return '\n'.join(description_parts)
    
    def _build_attendees_list(self, attendees: List[str]) -> List[Dict[str, Any]]:
        """Build attendees list for calendar event"""
        
        attendee_list = []
        
        for attendee in attendees:
            if isinstance(attendee, str):
                # Assume it's an email address
                attendee_list.append({
                    'email': attendee,
                    'responseStatus': 'needsAction'
                })
            elif isinstance(attendee, dict):
                # More detailed attendee info
                attendee_obj = {
                    'email': attendee.get('email', ''),
                    'responseStatus': 'needsAction'
                }
                
                if attendee.get('name'):
                    attendee_obj['displayName'] = attendee['name']
                
                if attendee.get('optional'):
                    attendee_obj['optional'] = True
                
                attendee_list.append(attendee_obj)
        
        return attendee_list
    
    def _build_recurrence_rule(self, recurrence: Dict[str, Any]) -> List[str]:
        """Build recurrence rule for repeating events"""
        
        try:
            frequency = recurrence.get('frequency', 'WEEKLY').upper()
            interval = recurrence.get('interval', 1)
            count = recurrence.get('count')
            until = recurrence.get('until')
            
            rrule = f"RRULE:FREQ={frequency};INTERVAL={interval}"
            
            if count:
                rrule += f";COUNT={count}"
            elif until:
                # Format until date
                until_date = datetime.fromisoformat(until).strftime('%Y%m%dT%H%M%SZ')
                rrule += f";UNTIL={until_date}"
            
            # Add days of week if specified
            if recurrence.get('days_of_week'):
                days = ','.join(recurrence['days_of_week'])
                rrule += f";BYDAY={days}"
            
            return [rrule]
            
        except Exception as e:
            logger.error(f"Failed to build recurrence rule: {e}")
            return []
    
    async def _insert_event(self, calendar_event: Dict[str, Any]) -> Dict[str, Any]:
        """Insert event into Google Calendar"""
        
        try:
            # Use primary calendar by default
            calendar_id = 'primary'
            
            # Create the event
            created_event = self.service.events().insert(
                calendarId=calendar_id,
                body=calendar_event,
                sendUpdates='all'  # Send invitations to attendees
            ).execute()
            
            logger.info(f"✅ Event inserted into calendar: {created_event.get('id')}")
            return created_event
            
        except HttpError as e:
            logger.error(f"HTTP error inserting calendar event: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to insert calendar event: {e}")
            raise
    
    async def _add_attendees(self, event_id: str, attendees: List[str]):
        """Add attendees to existing event"""
        
        try:
            # Get existing event
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Add new attendees to existing list
            existing_attendees = event.get('attendees', [])
            new_attendees = self._build_attendees_list(attendees)
            
            # Merge attendee lists (avoid duplicates)
            existing_emails = {att.get('email') for att in existing_attendees}
            for attendee in new_attendees:
                if attendee.get('email') not in existing_emails:
                    existing_attendees.append(attendee)
            
            # Update event with new attendees
            event['attendees'] = existing_attendees
            
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"✅ Added {len(new_attendees)} attendees to event")
            
        except Exception as e:
            logger.error(f"Failed to add attendees to event: {e}")
            # Don't raise - event creation should continue
    
    async def _set_event_reminders(self, event_id: str, event_data: Dict[str, Any]):
        """Set custom reminders for event"""
        
        try:
            # Get reminder preferences from event data
            reminder_prefs = event_data.get('reminders', {})
            
            # Default reminders
            reminders = [
                {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                {'method': 'popup', 'minutes': 30},       # 30 minutes before
            ]
            
            # Custom reminders if specified
            if reminder_prefs.get('custom_reminders'):
                reminders = []
                for reminder in reminder_prefs['custom_reminders']:
                    reminders.append({
                        'method': reminder.get('method', 'email'),
                        'minutes': reminder.get('minutes', 30)
                    })
            
            # Get existing event
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Update reminders
            event['reminders'] = {
                'useDefault': False,
                'overrides': reminders
            }
            
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"✅ Set {len(reminders)} reminders for event")
            
        except Exception as e:
            logger.error(f"Failed to set event reminders: {e}")
            # Don't raise - reminders are nice-to-have
    
    async def update_event(
        self,
        event_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update existing calendar event"""
        
        if not self.service:
            return {'error': 'Google Calendar service not available'}
        
        try:
            # Get existing event
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            # Apply updates
            if 'title' in updates:
                event['summary'] = updates['title']
            
            if 'description' in updates:
                event['description'] = updates['description']
            
            if 'start_date' in updates:
                event['start'] = self._format_datetime(updates['start_date'])
            
            if 'end_date' in updates:
                event['end'] = self._format_datetime(updates['end_date'])
            
            if 'location' in updates:
                event['location'] = self._build_location_string(updates['location'])
            
            # Update the event
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"✅ Updated calendar event: {event_id}")
            return {
                'event_id': updated_event.get('id'),
                'event_url': updated_event.get('htmlLink'),
                'updated_at': updated_event.get('updated')
            }
            
        except Exception as e:
            logger.error(f"Failed to update calendar event: {e}")
            return {'error': str(e)}
    
    async def cancel_event(self, event_id: str) -> Dict[str, Any]:
        """Cancel calendar event"""
        
        if not self.service:
            return {'error': 'Google Calendar service not available'}
        
        try:
            # Cancel the event (set status to cancelled)
            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            event['status'] = 'cancelled'
            
            cancelled_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event,
                sendUpdates='all'
            ).execute()
            
            logger.info(f"✅ Cancelled calendar event: {event_id}")
            return {
                'event_id': event_id,
                'status': 'cancelled',
                'cancelled_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to cancel calendar event: {e}")
            return {'error': str(e)}
    
    def _generate_fallback_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback event info when Calendar API unavailable"""
        
        title = event_data.get('title', 'Event')
        date = event_data.get('start_date', '')
        location = event_data.get('location', {})
        
        return {
            'suggested_event': {
                'title': title,
                'date': date,
                'location': self._build_location_string(location),
                'description': event_data.get('description', ''),
                'duration': '2 hours (suggested)',
                'reminders': [
                    '1 day before event',
                    '30 minutes before event'
                ]
            },
            'manual_steps': [
                'Create calendar event manually in Google Calendar',
                'Set title, date, time, and location',
                'Add event description with contact information',
                'Invite attendees via email addresses',
                'Set reminders for 1 day and 30 minutes before',
                'Share calendar invite with event organizers'
            ],
            'calendar_url': 'https://calendar.google.com/calendar/u/0/r/eventedit',
            'message': 'Google Calendar API not available - create event manually'
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Google Calendar Agent...")
        
        # Close any open connections
        self.service = None
        self.credentials = None
        
        logger.info("✅ Google Calendar Agent cleanup completed")