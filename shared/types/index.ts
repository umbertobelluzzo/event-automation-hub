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