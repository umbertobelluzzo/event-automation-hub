// =============================================================================
// Event Form Data Types
// =============================================================================

export type EventType = 'community' | 'speaker' | 'networking' | 'cultural' | 'educational' | 'social';

export type EventStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'cancelled' | 'completed';

export interface EventLocation {
  name: string;
  address: string;
  isOnline: boolean;
  meetingLink?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TicketInfo {
  isFree: boolean;
  price?: number;
  currency?: string;
  registrationRequired: boolean;
  maxAttendees?: number;
  registrationDeadline?: Date;
}

export interface ContentPreferences {
  flyerStyle: 'professional' | 'casual' | 'festive' | 'artistic';
  targetAudience: string[];
  keyMessages: string[];
  socialTone: 'formal' | 'friendly' | 'enthusiastic';
  primaryColor?: string;
  includeLogo?: boolean;
}

// =============================================================================
// Multi-Step Form Data Structure
// =============================================================================

export interface EventFormData {
  // Step 1: Event Basics
  eventType: EventType;
  title: string;
  description: string;
  
  // Step 2: Date & Location
  startDate: Date;
  endDate?: Date;
  timezone: string;
  location: EventLocation;
  
  // Step 3: Ticket & Registration
  ticketInfo: TicketInfo;
  
  // Step 4: AI Content Preferences
  contentPreferences: ContentPreferences;
  
  // Step 5: Review & Metadata
  tags: string[];
  customFields?: Record<string, any>;
  isPublic: boolean;
}

// =============================================================================
// Form Validation & Steps
// =============================================================================

export interface FormStepInfo {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  hasErrors: boolean;
}

export interface FormValidationError {
  field: string;
  message: string;
  step: number;
}

export interface FormSubmissionResult {
  success: boolean;
  eventId?: string;
  workflowSessionId?: string;
  errors?: FormValidationError[];
  message?: string;
}

// =============================================================================
// AI Workflow Types
// =============================================================================

export type WorkflowStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'waiting_approval' 
  | 'approved' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface GeneratedContent {
  flyerUrl?: string;
  flyerCanvaId?: string;
  instagramCaption?: string;
  linkedinCaption?: string;
  whatsappMessage?: string;
  googleCalendarId?: string;
  clickupTaskId?: string;
  driveFolder?: string;
  driveFolderUrl?: string;
}

export interface WorkflowProgress {
  sessionId: string;
  status: WorkflowStatus;
  currentStep: string;
  completedSteps: string[];
  failedSteps: string[];
  estimatedTimeRemaining?: number;
  errorMessage?: string;
  generatedContent?: GeneratedContent;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface EventCreationResponse {
  success: boolean;
  event?: {
    id: string;
    slug: string;
    title: string;
    status: EventStatus;
  };
  workflowSession?: {
    id: string;
    sessionId: string;
    status: WorkflowStatus;
  };
  errors?: FormValidationError[];
}

export interface EventListItem {
  id: string;
  title: string;
  slug: string;
  eventType: EventType;
  startDate: Date;
  location: EventLocation;
  status: EventStatus;
  isPublished: boolean;
  createdAt: Date;
  generatedContent?: GeneratedContent;
}