# Changelog

All notable changes to CrestDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.1.0] - 2026-02-15

### Added — Phase 1: Auth, Roles & Onboarding

#### Authentication
- JWT access tokens (15min, HS256) with refresh token rotation (7-day httpOnly cookies)
- User registration with Argon2id password hashing (64MB memory, 3 iterations)
- Login with brute-force protection (5 failed attempts → 15min lockout via Redis)
- Password strength validation (10+ chars, uppercase/lowercase/number)
- Have I Been Pwned password check (k-anonymity, password never leaves server)
- Token theft detection: reusing revoked refresh token revokes ALL user sessions
- Password reset flow via email with 1-hour expiry tokens
- Email verification flow

#### Multi-Factor Authentication
- TOTP setup with QR code generation (Google Authenticator, Authy compatible)
- MFA verification during login with backup code fallback
- 10 single-use backup codes generated on MFA setup
- MFA disable with password confirmation

#### Session Management
- Active session listing with device info and IP address
- Individual session revocation
- Admin force-logout capability (Owner can revoke any user's sessions)
- Session cleanup for expired tokens

#### Role-Based Access Control (RBAC)
- 4-level role hierarchy: Agent → Managing Broker → Principal Broker → Owner
- 80+ default permissions per role with resource:action:scope pattern
- Granular permission overrides (grant/deny per user)
- Role-based middleware guards for API endpoints
- Permission resolution combining role defaults + overrides

#### Tenant Management
- Tenant CRUD with branding (logo, colors, fonts)
- Licensed states and license number management
- Tenant settings and subscription management
- Custom brokerage compliance rules (stricter than federal/state)

#### User Management
- User listing with pagination and search (Managing Broker+)
- User invitation via email with 7-day expiry tokens
- Role assignment and changes (Owner only)
- Soft-delete users with session cleanup

#### Audit Logging
- Async, fire-and-forget audit log insertion (non-blocking)
- 20+ audit event types: login, register, MFA, password reset, role changes, etc.
- Immutable insert-only design with RLS-scoped reads

#### Feature Flags
- Flag evaluation with user/tenant overrides and percentage rollout
- Deterministic rollout using MD5 hash bucketing
- CRUD endpoints for flag management (Owner only)

#### Compliance Engine
- 250+ compliance rules seeded (federal + all 50 states + DC)
- Fair Housing Act: protected class term screening with block/warn enforcement
- RESPA, TILA, CAN-SPAM, TCPA, ESIGN Act, GLBA, ADA federal rules
- Per-state advertising, disclosure, e-signature, privacy, and retention rules
- Content compliance checking endpoint with violation detection
- Required insertion engine (Equal Housing Opportunity, license disclaimers)
- Custom brokerage rules that layer on top of federal/state requirements

#### Frontend — Auth Pages
- Login page with MFA verification flow
- Registration page with password strength indicator
- Forgot password and reset password pages
- Email verification page
- Two-column auth layout with branded hero panel

#### Frontend — Install Wizard (9 Steps)
- Welcome & brokerage name setup
- Multi-state license selection with per-state license numbers
- Branding configuration (logo, colors, fonts) with preview
- Email connection (Gmail/Outlook OAuth placeholders)
- MLS connection with credential testing (skippable)
- QuickBooks connection (skippable)
- Social media connections (skippable)
- Agent invitation with dynamic name/email pairs
- Review & launch summary with completion status

#### Frontend — Agent Onboarding (10 Steps)
- Profile setup with avatar upload
- Email and calendar connection
- Contact import (CSV, CRM migration, or skip)
- QuickBooks and social media connections
- Marketing style preferences (tone, emoji, platforms, auto-publish)
- License state confirmation
- Notification preferences with quiet hours
- Completion celebration screen

#### Frontend — Dashboard
- Role-specific dashboard content (Agent, Managing Broker, Principal Broker, Owner)
- Collapsible sidebar navigation with role-based menu items
- Dashboard header with user menu and mobile hamburger
- Stat cards with placeholder data for transactions, contacts, closings, revenue
- Team performance, compliance status, and review queue sections for brokers

#### Frontend — Settings Pages
- Profile settings (name, phone, licensed states, license numbers)
- Account & security (password change, MFA setup/disable, active sessions)
- Notification preferences with per-type toggles and quiet hours
- Connected accounts (email, calendar, MLS, QuickBooks, social media)
- Branding settings with live preview (Owner only)
- User management with invite, role change, and delete (Principal Broker+)
- Compliance rule management with custom rule creation (Principal Broker+)

#### Infrastructure
- API client with automatic token refresh and 401 retry
- React Query provider for data fetching/caching
- AuthGuard component for protected routes with session restoration
- Toast notification system
- Zustand auth store with in-memory token storage (XSS protection)

## [v0.0.1] - 2026-02-15

### Added
- Monorepo scaffold with Turborepo (TypeScript, Python, Rust)
- Database schema v1: tenants, users, sessions, permissions, audit_log, feature_flags, compliance_rules, tenant_compliance_rules
- Row-Level Security policies for multi-tenant data isolation
- API gateway service stub with Express.js, JWT auth middleware, rate limiting
- 6 TypeScript service stubs (transactions, crm, documents, notifications, social, billing)
- 7 Python service stubs (compliance, ai-docs, ai-copilot, ai-assist, ai-media, ai-marketing, preference-engine)
- 2 Rust service stubs (esign, media-encoder)
- Next.js 14 web app with Tailwind CSS, shadcn/ui design system, PWA manifest
- Shared packages: @crestdesk/types, @crestdesk/utils, @crestdesk/config, @crestdesk/ui, @crestdesk/db
- Docker Compose for local development (PostgreSQL 16, Redis 7, Elasticsearch 8)
- CI/CD pipelines (GitHub Actions PR + deploy workflows)
- Terraform foundation for AWS (VPC, ECS, RDS, Redis, S3)
- Protocol Buffer definitions (common, compliance, esign)
- Architecture Decision Records (ADR 0001-0010)
- Design tokens and component library (Button, Input, Card, Badge)
- ESLint, Prettier, Ruff, Black, Clippy linting configurations
- Conventional Commits enforcement with commitlint + husky
