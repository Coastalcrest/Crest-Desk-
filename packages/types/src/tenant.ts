// Tenant (brokerage) types

import type { SubscriptionPlan, SubscriptionStatus, UUID } from './common';

export interface Tenant {
  id: UUID;
  name: string;
  slug: string;
  ownerUserId: UUID;
  primaryState: string;
  licensedStates: string[];
  licenseNumbers: Record<string, string>;
  branding: TenantBranding;
  settings: Record<string, unknown>;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fonts?: {
    heading?: string;
    body?: string;
  };
}

export interface UpdateTenantRequest {
  name?: string;
  primaryState?: string;
  licensedStates?: string[];
  licenseNumbers?: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface UpdateBrandingRequest {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fonts?: {
    heading?: string;
    body?: string;
  };
}
