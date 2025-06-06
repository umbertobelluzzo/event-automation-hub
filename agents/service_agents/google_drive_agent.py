# =============================================================================
# agents/service_agents/google_drive_agent.py - Google Drive Integration Agent
# =============================================================================

import asyncio
import logging
import os
import io
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import base64
import httpx

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from googleapiclient.errors import HttpError

from utils.config import get_settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

class GoogleDriveAgent:
    """Agent for Google Drive folder creation and file organization"""
    
    def __init__(self):
        self.settings = get_settings()
        self.service = None
        self.credentials = None
        self.scopes = [
            'https://www.googleapis.com/auth/drive'
        ]
    
    async def initialize(self):
        """Initialize the Google Drive Agent"""
        logger.info("Initializing Google Drive Agent...")
        
        try:
            # Initialize Google Drive API service
            await self._setup_credentials()
            await self._build_service()
            
            # Test connection
            if await self._test_connection():
                logger.info("✅ Google Drive Agent initialized successfully")
            else:
                logger.warning("⚠️ Google Drive Agent initialized but connection test failed")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Google Drive Agent: {e}")
            # Don't raise - allow system to continue without Drive integration
    
    async def _setup_credentials(self):
        """Setup Google Drive API credentials"""
        
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
                    service_account_path = self.settings.google_service_account_key_path
                    logger.info(f"Service account path from settings: {service_account_path}")
                    logger.info(f"Does service account path exist? {os.path.exists(service_account_path)}")
                    
                    if service_account_path and os.path.exists(service_account_path):
                        from google.oauth2 import service_account
                        import json

                        # Load the service account key file to get the client_email
                        with open(service_account_path, 'r') as f:
                            sa_info = json.load(f)
                        subject_email = sa_info.get('client_email')
                        if not subject_email:
                            logger.error("Could not find client_email in service account key file.")
                            raise ValueError("client_email missing from service account JSON")
                        logger.info(f"Using subject_email for Drive credentials: {subject_email}")

                        self.credentials = service_account.Credentials.from_service_account_file(
                            service_account_path, 
                            scopes=self.scopes,
                            subject=subject_email
                        )
                        
                        # Explicitly refresh the credentials to obtain a token
                        try:
                            auth_request = Request()
                            self.credentials.refresh(auth_request)
                            if self.credentials.token:
                                logger.info("Successfully refreshed credentials and obtained an access token for Drive.")
                            else:
                                logger.error("Credentials refreshed but no access token was obtained for Drive.")
                                # Potentially raise an error or handle this state
                        except Exception as refresh_err:
                            logger.error(f"Error explicitly refreshing Drive credentials: {refresh_err}")
                            # Potentially raise or handle

                    else:
                        logger.warning("No Google credentials found - Drive integration will be limited")
                        return
            
        except Exception as e:
            logger.error(f"Failed to setup Google Drive credentials: {e}")
            raise
    
    async def _build_service(self):
        """Build Google Drive API service"""
        
        if not self.credentials:
            logger.warning("No credentials available for Google Drive service")
            return
        
        try:
            self.service = build('drive', 'v3', credentials=self.credentials)
            logger.info("✅ Google Drive service built successfully")
            
        except Exception as e:
            logger.error(f"Failed to build Google Drive service: {e}")
            raise
    
    async def _test_connection(self) -> bool:
        """Test Google Drive API connection"""
        
        if not self.service:
            return False
        
        try:
            # Try to get user info
            about = self.service.about().get(fields='user').execute()
            user_email = about.get('user', {}).get('emailAddress', 'Unknown')
            logger.info(f"Connected to Google Drive as: {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Google Drive connection test failed: {e}")
            return False
    
    async def setup_event_folder(
        self,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create event folder and organize files"""
        
        logger.info(f"Setting up Google Drive folder for event: {event_data.get('title', 'Untitled')}")
        
        if not self.service:
            logger.warning("Google Drive service not available")
            return {
                'error': 'Google Drive service not initialized',
                'fallback_organization': self._generate_folder_structure(event_data)
            }
        
        try:
            # Create main event folder
            folder_result = await self._create_event_folder(event_data)
            
            # Create subfolders
            subfolders = await self._create_subfolders(folder_result['folder_id'], event_data)
            
            # Upload generated content files
            uploaded_files = await self._upload_generated_content(
                folder_result['folder_id'],
                subfolders,
                generated_content,
                event_data
            )
            
            # Create shared documents
            shared_docs = await self._create_shared_documents(
                folder_result['folder_id'],
                subfolders,
                event_data
            )
            
            # Set folder permissions
            await self._set_folder_permissions(folder_result['folder_id'], event_data)
            
            result = {
                'folder_id': folder_result['folder_id'],
                'folder_url': folder_result['folder_url'],
                'folder_name': folder_result['folder_name'],
                'subfolders': subfolders,
                'uploaded_files': uploaded_files,
                'shared_documents': shared_docs,
                'organization_complete': True,
                'created_at': datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ Google Drive setup completed for event")
            return result
            
        except Exception as e:
            logger.error(f"❌ Google Drive setup failed: {e}")
            return {
                'error': str(e),
                'fallback_organization': self._generate_folder_structure(event_data)
            }
    
    async def _create_event_folder(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create main event folder"""
        
        # Generate folder name
        title = event_data.get('title', 'Untitled Event')
        date = event_data.get('start_date', '').split('T')[0] if event_data.get('start_date') else 'TBD'
        folder_name = f"UIS Event - {title} ({date})"
        
        try:
            # Create folder metadata
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'description': f"Event folder for {title}. Created by UIS Event Automation System."
            }
            
            # Use parent folder ID if provided in settings
            if self.settings.google_drive_parent_folder_id:
                folder_metadata['parents'] = [self.settings.google_drive_parent_folder_id]
                logger.info(f"Attempting to create folder under parent ID: {self.settings.google_drive_parent_folder_id}")
            else:
                logger.info("No parent folder ID provided, creating folder in root Drive.")
            
            # Create the folder
            folder = self.service.files().create(
                body=folder_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            folder_id = folder.get('id')
            folder_url = folder.get('webViewLink')
            
            logger.info(f"✅ Created event folder: {folder_name} ({folder_id})")
            
            return {
                'folder_id': folder_id,
                'folder_url': folder_url,
                'folder_name': folder_name
            }
            
        except HttpError as e:
            logger.error(f"Failed to create event folder: {e}")
            raise
    
    async def _create_subfolders(
        self,
        parent_folder_id: str,
        event_data: Dict[str, Any]
    ) -> Dict[str, Dict[str, str]]:
        """Create organized subfolders"""
        
        # Define subfolder structure
        subfolder_names = {
            'promotional': 'Promotional Materials',
            'planning': 'Event Planning',
            'assets': 'Event Assets',
            'communications': 'Communications',
            'documentation': 'Documentation',
            'feedback': 'Feedback & Follow-up'
        }
        
        subfolders = {}
        
        try:
            for key, name in subfolder_names.items():
                subfolder_metadata = {
                    'name': name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [parent_folder_id]
                }
                
                subfolder = self.service.files().create(
                    body=subfolder_metadata,
                    fields='id, name, webViewLink'
                ).execute()
                
                subfolders[key] = {
                    'id': subfolder.get('id'),
                    'name': name,
                    'url': subfolder.get('webViewLink')
                }
                
                logger.info(f"Created subfolder: {name}")
            
            logger.info(f"✅ Created {len(subfolders)} subfolders")
            return subfolders
            
        except HttpError as e:
            logger.error(f"Failed to create subfolders: {e}")
            raise
    
    async def _upload_generated_content(
        self,
        parent_folder_id: str,
        subfolders: Dict[str, Dict[str, str]],
        generated_content: Dict[str, Any],
        event_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Upload all generated content files to their respective subfolders."""
        
        uploaded_files = []
        
        # Upload flyer image
        flyer_upload = await self._upload_flyer_image(
            subfolders.get('promotional', {}).get('id'),
            generated_content,
            event_data
        )
        if flyer_upload:
            uploaded_files.append(flyer_upload)
            
        # Create social media content document
        social_doc = await self._create_social_media_document(
            subfolders['communications']['id'],
            generated_content,
            event_data
        )
        if social_doc:
            uploaded_files.append(social_doc)
            
        # Create WhatsApp message document
        if generated_content.get('whatsapp_message'):
            whatsapp_doc = await self._create_whatsapp_document(
                subfolders['communications']['id'],
                generated_content,
                event_data
            )
            if whatsapp_doc:
                uploaded_files.append(whatsapp_doc)
            
        # Create event summary document
        summary_doc = await self._create_event_summary_document(
            subfolders['documentation']['id'],
            event_data,
            generated_content
        )
        if summary_doc:
            uploaded_files.append(summary_doc)
            
        logger.info(f"✅ Uploaded {len(uploaded_files)} content files")
        return uploaded_files
    
    async def _upload_flyer_image(
        self,
        folder_id: str,
        generated_content: Dict[str, Any],
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Downloads the flyer from its URL and uploads it as a PNG to Google Drive."""
        flyer_url = generated_content.get("flyer_url")
        if not folder_id or not flyer_url:
            logger.warning("Missing folder_id or flyer_url, cannot upload flyer image.")
            return None

        event_title = event_data.get("title", "Untitled Event").replace(" ", "_")
        file_name = f"{event_title}_flyer.png"

        try:
            # Asynchronously download the image
            async with httpx.AsyncClient() as client:
                response = await client.get(flyer_url)
                response.raise_for_status()
                image_data = response.content

            # Prepare media for upload
            fh = io.BytesIO(image_data)
            media = MediaIoBaseUpload(fh, mimetype='image/png', resumable=True)
            
            file_metadata = {
                'name': file_name,
                'parents': [folder_id]
            }
            
            # Upload the file
            loop = asyncio.get_running_loop()
            file = await loop.run_in_executor(
                None,
                lambda: self.service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, name, webViewLink'
                ).execute()
            )

            logger.info(f"✅ Successfully uploaded flyer '{file_name}' to Google Drive.")
            return {
                'id': file.get('id'),
                'name': file.get('name'),
                'url': file.get('webViewLink'),
                'type': 'flyer_image'
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to download flyer image from {flyer_url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to upload flyer image to Google Drive: {e}")
            return None
    
    async def _create_social_media_document(
        self,
        folder_id: str,
        generated_content: Dict[str, Any],
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create social media content document"""
        
        try:
            # Build content
            content_parts = [
                f"SOCIAL MEDIA CONTENT - {event_data.get('title', 'Event')}",
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n"
            ]
            
            # Instagram content
            if generated_content.get('instagram_caption'):
                content_parts.extend([
                    "INSTAGRAM POST:",
                    "=" * 50,
                    generated_content['instagram_caption'],
                    "\n" + "-" * 50 + "\n"
                ])
            
            # LinkedIn content
            if generated_content.get('linkedin_caption'):
                content_parts.extend([
                    "LINKEDIN POST:",
                    "=" * 50,
                    generated_content['linkedin_caption'],
                    "\n" + "-" * 50 + "\n"
                ])
            
            # Facebook content
            if generated_content.get('facebook_caption'):
                content_parts.extend([
                    "FACEBOOK POST:",
                    "=" * 50,
                    generated_content['facebook_caption'],
                    "\n" + "-" * 50 + "\n"
                ])
            
            # Twitter content
            if generated_content.get('twitter_caption'):
                content_parts.extend([
                    "TWITTER POST:",
                    "=" * 50,
                    generated_content['twitter_caption'],
                    "\n" + "-" * 50 + "\n"
                ])
            
            content_parts.extend([
                "\nPOSTING SCHEDULE RECOMMENDATIONS:",
                "- Instagram: 6-9 PM on weekdays",
                "- LinkedIn: 9 AM-5 PM, Tuesday-Thursday",
                "- Facebook: 1-4 PM on weekdays",
                "- Twitter: 12-3 PM, 5-6 PM",
                "\nHASHTAG STRATEGY:",
                "- Use platform-specific hashtags",
                "- Mix popular and niche hashtags",
                "- Create a branded event hashtag",
                "\nENGAGEMENT TIPS:",
                "- Respond to comments within 1 hour",
                "- Share behind-the-scenes content in stories",
                "- Cross-promote on all platforms",
                "- Tag relevant community members and organizations"
            ])
            
            full_content = "\n".join(content_parts)
            
            # Create Google Doc
            doc_metadata = {
                'name': f'{event_data.get("title", "Event")} - Social Media Content',
                'parents': [folder_id],
                'mimeType': 'application/vnd.google-apps.document'
            }
            
            doc = self.service.files().create(
                body=doc_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            # Add content
            docs_service = build('docs', 'v1', credentials=self.credentials)
            requests = [{
                'insertText': {
                    'location': {'index': 1},
                    'text': full_content
                }
            }]
            
            docs_service.documents().batchUpdate(
                documentId=doc.get('id'),
                body={'requests': requests}
            ).execute()
            
            return {
                'id': doc.get('id'),
                'name': doc.get('name'),
                'url': doc.get('webViewLink'),
                'type': 'social_media_content'
            }
            
        except Exception as e:
            logger.error(f"Failed to create social media document: {e}")
            return None
    
    async def _create_whatsapp_document(
        self,
        folder_id: str,
        generated_content: Dict[str, Any],
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create WhatsApp message document"""
        
        try:
            whatsapp_data = generated_content.get('whatsapp_message', {})
            
            if isinstance(whatsapp_data, str):
                main_message = whatsapp_data
                variations = []
                broadcast_suggestions = {}
            else:
                main_message = whatsapp_data.get('content', '')
                variations = whatsapp_data.get('variations', [])
                broadcast_suggestions = whatsapp_data.get('broadcast_suggestions', {})
            
            content_parts = [
                f"WHATSAPP COMMUNICATIONS - {event_data.get('title', 'Event')}",
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n",
                "MAIN MESSAGE:",
                "=" * 50,
                main_message,
                "\n" + "-" * 50 + "\n"
            ]
            
            # Add variations
            if variations:
                content_parts.append("MESSAGE VARIATIONS:")
                for i, variation in enumerate(variations, 1):
                    if isinstance(variation, dict):
                        content_parts.extend([
                            f"\n{i}. {variation.get('type', 'Variation').upper()}:",
                            variation.get('content', ''),
                            f"({variation.get('description', 'No description')})"
                        ])
                    else:
                        content_parts.extend([f"\n{i}. {variation}"])
                content_parts.append("-" * 50)
            
            # Add broadcast suggestions
            if broadcast_suggestions:
                content_parts.extend([
                    "\nBROADCAST LIST RECOMMENDATIONS:",
                    "Primary Lists: " + ", ".join(broadcast_suggestions.get('primary_lists', [])),
                    "Secondary Lists: " + ", ".join(broadcast_suggestions.get('secondary_lists', [])),
                ])
            
            content_parts.extend([
                "\nBEST PRACTICES:",
                "- Send during high engagement times (6-8 PM)",
                "- Test message formatting on different devices",
                "- Keep broadcast lists under 256 contacts",
                "- Follow up with non-responders after 24-48 hours",
                "- Use WhatsApp Business for better analytics",
                "\nFORMATTING TIPS:",
                "- Use *bold* for important information",
                "- Use _italics_ for emphasis",
                "- Keep paragraphs short for mobile reading",
                "- Use emojis to break up text visually"
            ])
            
            full_content = "\n".join(content_parts)
            
            # Create Google Doc
            doc_metadata = {
                'name': f'{event_data.get("title", "Event")} - WhatsApp Messages',
                'parents': [folder_id],
                'mimeType': 'application/vnd.google-apps.document'
            }
            
            doc = self.service.files().create(
                body=doc_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            # Add content
            docs_service = build('docs', 'v1', credentials=self.credentials)
            requests = [{
                'insertText': {
                    'location': {'index': 1},
                    'text': full_content
                }
            }]
            
            docs_service.documents().batchUpdate(
                documentId=doc.get('id'),
                body={'requests': requests}
            ).execute()
            
            return {
                'id': doc.get('id'),
                'name': doc.get('name'),
                'url': doc.get('webViewLink'),
                'type': 'whatsapp_messages'
            }
            
        except Exception as e:
            logger.error(f"Failed to create WhatsApp document: {e}")
            return None
    
    async def _create_event_summary_document(
        self,
        folder_id: str,
        event_data: Dict[str, Any],
        generated_content: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create comprehensive event summary document"""
        
        try:
            # Format location
            location = event_data.get('location', {})
            if location.get('is_online'):
                location_str = f"Online Event\nMeeting URL: {location.get('meeting_url', 'TBD')}"
            else:
                location_str = f"{location.get('name', 'Location TBD')}\nAddress: {location.get('address', 'Address TBD')}"
            
            content_parts = [
                f"EVENT SUMMARY - {event_data.get('title', 'Untitled Event')}",
                f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}\n",
                "EVENT DETAILS:",
                "=" * 50,
                f"Title: {event_data.get('title', 'TBD')}",
                f"Type: {event_data.get('event_type', 'TBD')}",
                f"Date: {event_data.get('start_date', 'TBD')}",
                f"Location: {location_str}",
                f"Description: {event_data.get('description', 'No description provided')}",
                "\n" + "-" * 50 + "\n",
                "GENERATED CONTENT SUMMARY:",
                "=" * 50
            ]
            
            # Add content summary
            if generated_content.get('flyer_url'):
                content_parts.append(f"✅ Event Flyer: {generated_content['flyer_url']}")
            
            social_platforms = []
            if generated_content.get('instagram_caption'):
                social_platforms.append('Instagram')
            if generated_content.get('linkedin_caption'):
                social_platforms.append('LinkedIn')
            if generated_content.get('facebook_caption'):
                social_platforms.append('Facebook')
            if generated_content.get('twitter_caption'):
                social_platforms.append('Twitter')
            
            if social_platforms:
                content_parts.append(f"✅ Social Media Content: {', '.join(social_platforms)}")
            
            if generated_content.get('whatsapp_message'):
                content_parts.append("✅ WhatsApp Broadcast Message")
            
            if generated_content.get('google_calendar_id'):
                content_parts.append(f"✅ Google Calendar Event: {generated_content.get('google_calendar_url', 'Created')}")
            
            if generated_content.get('clickup_task_id'):
                content_parts.append(f"✅ ClickUp Task: {generated_content.get('clickup_task_url', 'Created')}")
            
            content_parts.extend([
                "\n" + "-" * 50 + "\n",
                "NEXT STEPS:",
                "=" * 50,
                "1. Review all generated content for accuracy",
                "2. Customize content as needed for your brand voice",
                "3. Schedule social media posts using the recommended times",
                "4. Send WhatsApp messages to appropriate broadcast lists",
                "5. Share flyer across all promotional channels",
                "6. Monitor engagement and respond to inquiries",
                "7. Follow up with attendees after the event",
                "\nPROMOTION CHECKLIST:",
                "☐ Post on all social media platforms",
                "☐ Send WhatsApp broadcast messages",
                "☐ Share flyer in community groups",
                "☐ Add event to organization website",
                "☐ Email invitations to member list",
                "☐ Print flyers for physical distribution",
                "☐ Create event on Facebook/Eventbrite if applicable",
                "\nDAY-OF-EVENT CHECKLIST:",
                "☐ Arrive early for setup",
                "☐ Test all equipment and technology",
                "☐ Prepare welcome materials and signage",
                "☐ Assign roles to volunteers/staff",
                "☐ Have contact information readily available",
                "☐ Take photos for future promotion",
                "☐ Collect feedback from attendees"
            ])
            
            full_content = "\n".join(content_parts)
            
            # Create Google Doc
            doc_metadata = {
                'name': f'{event_data.get("title", "Event")} - Complete Summary',
                'parents': [folder_id],
                'mimeType': 'application/vnd.google-apps.document'
            }
            
            doc = self.service.files().create(
                body=doc_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            # Add content
            docs_service = build('docs', 'v1', credentials=self.credentials)
            requests = [{
                'insertText': {
                    'location': {'index': 1},
                    'text': full_content
                }
            }]
            
            docs_service.documents().batchUpdate(
                documentId=doc.get('id'),
                body={'requests': requests}
            ).execute()
            
            return {
                'id': doc.get('id'),
                'name': doc.get('name'),
                'url': doc.get('webViewLink'),
                'type': 'event_summary'
            }
            
        except Exception as e:
            logger.error(f"Failed to create event summary document: {e}")
            return None
    
    async def _create_shared_documents(
        self,
        parent_folder_id: str,
        subfolders: Dict[str, Dict[str, str]],
        event_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create shared planning documents"""
        
        shared_docs = []
        
        try:
            # Create planning checklist
            checklist_doc = await self._create_planning_checklist(
                subfolders['planning']['id'],
                event_data
            )
            if checklist_doc:
                shared_docs.append(checklist_doc)
            
            # Create volunteer signup sheet
            volunteer_sheet = await self._create_volunteer_sheet(
                subfolders['planning']['id'],
                event_data
            )
            if volunteer_sheet:
                shared_docs.append(volunteer_sheet)
            
            # Create feedback form
            feedback_form = await self._create_feedback_form(
                subfolders['feedback']['id'],
                event_data
            )
            if feedback_form:
                shared_docs.append(feedback_form)
            
            logger.info(f"✅ Created {len(shared_docs)} shared documents")
            return shared_docs
            
        except Exception as e:
            logger.error(f"Failed to create shared documents: {e}")
            return shared_docs
    
    async def _create_planning_checklist(
        self,
        folder_id: str,
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create event planning checklist"""
        
        try:
            checklist_content = f"""EVENT PLANNING CHECKLIST - {event_data.get('title', 'Event')}

6 WEEKS BEFORE:
☐ Confirm venue and date
☐ Create event budget
☐ Book speakers/entertainment
☐ Design promotional materials
☐ Set up registration system

4 WEEKS BEFORE:
☐ Send save-the-dates
☐ Launch social media campaign
☐ Order catering/refreshments
☐ Arrange necessary permits
☐ Recruit volunteers

2 WEEKS BEFORE:
☐ Send final invitations
☐ Confirm all vendors
☐ Prepare materials and signage
☐ Finalize attendee count
☐ Brief all volunteers

1 WEEK BEFORE:
☐ Confirm setup/cleanup crew
☐ Prepare welcome packets
☐ Test all equipment
☐ Send reminder communications
☐ Review emergency procedures

DAY OF EVENT:
☐ Arrive early for setup
☐ Check in volunteers/staff
☐ Test all systems
☐ Welcome attendees
☐ Monitor event flow
☐ Document with photos/video
☐ Begin cleanup process
☐ Thank volunteers and attendees

AFTER EVENT:
☐ Send thank you messages
☐ Collect and review feedback
☐ Process any remaining items
☐ Document lessons learned
☐ Plan follow-up activities
☐ Update contact database
☐ Share event highlights

NOTES:
(Add your own notes and updates here)
"""
            
            # Create Google Doc
            doc_metadata = {
                'name': f'{event_data.get("title", "Event")} - Planning Checklist',
                'parents': [folder_id],
                'mimeType': 'application/vnd.google-apps.document'
            }
            
            doc = self.service.files().create(
                body=doc_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            # Add content
            docs_service = build('docs', 'v1', credentials=self.credentials)
            requests = [{
                'insertText': {
                    'location': {'index': 1},
                    'text': checklist_content
                }
            }]
            
            docs_service.documents().batchUpdate(
                documentId=doc.get('id'),
                body={'requests': requests}
            ).execute()
            
            return {
                'id': doc.get('id'),
                'name': doc.get('name'),
                'url': doc.get('webViewLink'),
                'type': 'planning_checklist'
            }
            
        except Exception as e:
            logger.error(f"Failed to create planning checklist: {e}")
            return None
    
    async def _create_volunteer_sheet(
        self,
        folder_id: str,
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create volunteer signup sheet"""
        
        try:
            # Create Google Sheet instead of Doc for better collaboration
            sheet_metadata = {
                'name': f'{event_data.get("title", "Event")} - Volunteer Signup',
                'parents': [folder_id],
                'mimeType': 'application/vnd.google-apps.spreadsheet'
            }
            
            sheet = self.service.files().create(
                body=sheet_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            # Add basic structure using Sheets API
            try:
                sheets_service = build('sheets', 'v4', credentials=self.credentials)
                
                # Define header row and sample data
                values = [
                    ['Name', 'Email', 'Phone', 'Role Preference', 'Availability', 'Comments', 'Status'],
                    ['John Doe', 'john@example.com', '555-0123', 'Setup/Cleanup', '2 hours before event', 'Can help with heavy lifting', 'Confirmed'],
                    ['Jane Smith', 'jane@example.com', '555-0456', 'Registration', 'During event', 'Bilingual English/Italian', 'Pending'],
                    ['', '', '', '', '', '', '']  # Empty row for new entries
                ]
                
                body = {
                    'values': values
                }
                
                sheets_service.spreadsheets().values().update(
                    spreadsheetId=sheet.get('id'),
                    range='A1:G4',
                    valueInputOption='RAW',
                    body=body
                ).execute()
                
            except Exception as sheets_error:
                logger.warning(f"Could not format volunteer sheet: {sheets_error}")
            
            return {
                'id': sheet.get('id'),
                'name': sheet.get('name'),
                'url': sheet.get('webViewLink'),
                'type': 'volunteer_signup'
            }
            
        except Exception as e:
            logger.error(f"Failed to create volunteer sheet: {e}")
            return None
    
    async def _create_feedback_form(
        self,
        folder_id: str,
        event_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Create feedback collection document"""
        
        try:
            feedback_content = f"""POST-EVENT FEEDBACK - {event_data.get('title', 'Event')}

Thank you for attending our event! Your feedback helps us improve future events.

EVENT RATING:
Overall Experience: ⭐⭐⭐⭐⭐ (circle your rating)

WHAT DID YOU ENJOY MOST?
_________________________________________________________
_________________________________________________________
_________________________________________________________

WHAT COULD BE IMPROVED?
_________________________________________________________
_________________________________________________________
_________________________________________________________

LIKELIHOOD TO ATTEND FUTURE EVENTS:
☐ Very Likely  ☐ Likely  ☐ Neutral  ☐ Unlikely  ☐ Very Unlikely

SUGGESTIONS FOR FUTURE EVENTS:
_________________________________________________________
_________________________________________________________
_________________________________________________________

ADDITIONAL COMMENTS:
_________________________________________________________
_________________________________________________________
_________________________________________________________

CONTACT INFORMATION (Optional):
Name: _________________________________________________
Email: ________________________________________________
Phone: _______________________________________________

Would you like to volunteer for future events? ☐ Yes ☐ No

Thank you for your time and feedback!
United Italian Societies
"""
            
            # Create Google Doc
            doc_metadata = {
                'name': f'{event_data.get("title", "Event")} - Feedback Form',
                'parents': [folder_id],
                'mimeType': 'application/vnd.google-apps.document'
            }
            
            doc = self.service.files().create(
                body=doc_metadata,
                fields='id, name, webViewLink'
            ).execute()
            
            # Add content
            docs_service = build('docs', 'v1', credentials=self.credentials)
            requests = [{
                'insertText': {
                    'location': {'index': 1},
                    'text': feedback_content
                }
            }]
            
            docs_service.documents().batchUpdate(
                documentId=doc.get('id'),
                body={'requests': requests}
            ).execute()
            
            return {
                'id': doc.get('id'),
                'name': doc.get('name'),
                'url': doc.get('webViewLink'),
                'type': 'feedback_form'
            }
            
        except Exception as e:
            logger.error(f"Failed to create feedback form: {e}")
            return None
    
    async def _set_folder_permissions(
        self,
        folder_id: str,
        event_data: Dict[str, Any]
    ):
        """Set appropriate permissions for the event folder"""
        
        try:
            # Set folder to be viewable by organization members
            # In production, you'd configure specific email addresses or domains
            
            permission = {
                'type': 'anyone',
                'role': 'reader',
                'allowFileDiscovery': False
            }
            
            self.service.permissions().create(
                fileId=folder_id,
                body=permission,
                fields='id'
            ).execute()
            
            logger.info(f"✅ Set permissions for folder: {folder_id}")
            
        except Exception as e:
            logger.error(f"Failed to set folder permissions: {e}")
            # Don't raise - permissions are nice-to-have
    
    def _generate_folder_structure(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate fallback folder structure when Drive API unavailable"""
        
        title = event_data.get('title', 'Event')
        date = event_data.get('start_date', '').split('T')[0] if event_data.get('start_date') else 'TBD'
        
        return {
            'suggested_structure': {
                'main_folder': f"UIS Event - {title} ({date})",
                'subfolders': [
                    'Promotional Materials',
                    'Event Planning', 
                    'Event Assets',
                    'Communications',
                    'Documentation',
                    'Feedback & Follow-up'
                ]
            },
            'recommended_files': [
                'Event Flyer (from Canva)',
                'Social Media Content Document',
                'WhatsApp Messages Document',
                'Event Planning Checklist',
                'Volunteer Signup Sheet',
                'Post-Event Feedback Form',
                'Event Summary & Next Steps'
            ],
            'organization_tips': [
                'Create folders in your Google Drive manually',
                'Share folders with relevant team members',
                'Set appropriate permissions for each folder',
                'Use consistent naming conventions',
                'Archive folders after events are complete'
            ],
            'message': 'Google Drive API not available - use this structure manually'
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up Google Drive Agent...")
        
        # Close any open connections
        self.service = None
        self.credentials = None
        
        logger.info("✅ Google Drive Agent cleanup completed")