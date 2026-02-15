// Compliance types

import type { ComplianceEnforcement, ContentType, UUID } from './common';

export interface ComplianceRule {
  id: UUID;
  jurisdiction: string;
  category: string;
  subcategory: string;
  ruleKey: string;
  title: string;
  description: string;
  enforcement: ComplianceEnforcement;
  parameters: Record<string, unknown>;
  appliesTo: ContentType[];
  effectiveDate: string;
  supersededDate: string | null;
  version: number;
  sourceReference: string | null;
}

export interface TenantComplianceRule {
  id: UUID;
  tenantId: UUID;
  category: string;
  title: string;
  description: string;
  enforcement: ComplianceEnforcement;
  parameters: Record<string, unknown>;
  appliesTo: ContentType[];
  active: boolean;
  createdBy: UUID;
  createdAt: string;
}

export interface ContentCheckRequest {
  content: string;
  contentType: ContentType;
  state: string;
  metadata?: Record<string, string>;
}

export interface ContentCheckResponse {
  compliant: boolean;
  violations: Violation[];
  requiredInsertions: Insertion[];
}

export interface Violation {
  ruleKey: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  jurisdiction: string;
}

export interface Insertion {
  ruleKey: string;
  text: string;
  position: 'prepend' | 'append' | 'footer';
  jurisdiction: string;
}

export interface FeatureFlag {
  id: UUID;
  key: string;
  enabled: boolean;
  tenantOverrides: Record<string, boolean>;
  userOverrides: Record<string, boolean>;
  rolloutPercentage: number;
  description: string | null;
}
