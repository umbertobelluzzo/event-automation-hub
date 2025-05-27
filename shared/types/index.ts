// Export all types from shared modules
export * from './events';

// =============================================================================
// Common API Types
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

// =============================================================================
// User & Authentication Types
// =============================================================================

export type UserRole = 'admin' | 'organizer' | 'volunteer';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: User;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

// =============================================================================
// System Configuration Types
// =============================================================================

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface EventFormData {
  // Step 1: Event Basics
  eventType: 'community' | 'conference' | 'workshop' | 'webinar' | 'other';
  title: string;
  description: string;
  
  // Step 2: Date & Location
  startDate: Date;
  endDate?: Date;
  timezone: string;
  location: {
    name: string; // Venue name or online platform
    address: string; // Full address for in-person, empty for online
    isOnline: boolean;
    meetingLink?: string; // For online events
  };
  
  // Step 3: Ticket & Registration
  ticketInfo: {
    isFree: boolean;
    price?: number;
    currency: 'USD' | 'EUR' | 'GBP'; // Example currencies
    maxAttendees?: number;
    registrationRequired: boolean;
    registrationDeadline?: Date;
  };
  
  // Step 4: AI Content Preferences
  contentPreferences: {
    flyerStyle: 'professional' | 'artistic' | 'minimalist' | 'playful';
    targetAudience: string[]; // Array of predefined or custom audiences
    keyMessages: string[]; // Key selling points or information
    socialTone: 'formal' | 'friendly' | 'humorous' | 'informative';
    includeLogo: boolean;
    brandColors?: string[]; // Optional: primary brand colors
    additionalInstructions?: string; // Any other specific requests
  };
  
  // Step 5: Review & Metadata
  tags: string[]; // Keywords for discoverability
  isPublic: boolean; // Publicly listed or private event
  organizerName?: string;
  organizerContact?: string;
  consentDataAccuracy: boolean;
  consentAiGeneration: boolean;
}