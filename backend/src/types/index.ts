// =============================================================================
// backend/src/types/index.ts - Backend Type Definitions
// =============================================================================

export interface APIResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Array<{
      field: string;
      message: string;
      code?: string;
    }>;
    meta?: {
      timestamp: string;
      requestId: string;
      version: string;
    };
  }
  
  export interface PaginatedResponse<T> extends APIResponse<T[]> {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }
  
  export type UserRole = 'ADMIN' | 'ORGANIZER' | 'VOLUNTEER';
  
  export type EventType = 'COMMUNITY' | 'SPEAKER' | 'NETWORKING' | 'CULTURAL' | 'EDUCATIONAL' | 'SOCIAL';
  
  export type EventStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  
  export type WorkflowStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
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
    currency: string;
    registrationRequired: boolean;
    maxAttendees?: number;
    registrationDeadline?: Date;
  }
  
  export interface ContentPreferences {
    flyerStyle: 'professional' | 'casual' | 'festive' | 'artistic';
    targetAudience: string[];
    keyMessages: string[];
    socialTone: 'formal' | 'friendly' | 'enthusiastic';
    includeLogo: boolean;
  }
  
  export interface EventFormData {
    eventType: EventType;
    title: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    timezone: string;
    location: EventLocation;
    ticketInfo: TicketInfo;
    contentPreferences: ContentPreferences;
    tags: string[];
    isPublic: boolean;
  }
  
  export interface WorkflowProgress {
    sessionId: string;
    status: WorkflowStatus;
    currentStep: string;
    completedSteps: string[];
    failedSteps: string[];
    estimatedTimeRemaining?: number;
    errorMessage?: string;
    generatedContent?: any;
  }
  
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
    errors?: Array<{
      field: string;
      message: string;
    }>;
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
    generatedContent?: any;
  }
  