// Common types used across the entire platform

export type UUID = string;

export type Role = 'agent' | 'managing_broker' | 'principal_broker' | 'owner';

export type ComplianceEnforcement = 'block' | 'warn' | 'require' | 'insert';

export type ContentType = 'social_post' | 'listing_image' | 'email' | 'document' | 'video';

export type SubscriptionPlan = 'trial' | 'solo' | 'team' | 'brokerage' | 'enterprise';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId: string;
  };
}

export interface AuditLogEntry {
  id: string;
  tenantId: UUID;
  userId: UUID | null;
  action: string;
  resourceType: string;
  resourceId: UUID | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface EventEnvelope<T = Record<string, unknown>> {
  id: string;
  type: string;
  tenantId: UUID;
  userId: UUID | null;
  timestamp: string;
  version: number;
  payload: T;
}
