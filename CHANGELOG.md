# Changelog

All notable changes to CrestDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.4.0] - 2026-02-15

### Added — Phase 4: Broker Review & AI Audit

#### Database Schema (4 New Tables)
- Review queue table for prioritized broker review workflow with risk/readiness scores
- Review findings table for AI-detected and broker-identified issues with severity levels
- AI review feedback table for broker corrections that train the AI learning engine
- Agent coaching insights table for AI-detected per-agent patterns and reminders
- Row-Level Security policies for all Phase 4 tables
- Updated_at triggers for automatic timestamp management

#### Review Queue Management (Gateway API)
- Prioritized review queue with risk score and readiness score ranking
- Submit transactions for broker review with auto-priority calculation
- Start/complete review workflow with reviewer assignment
- Dashboard stats endpoint (pending, in_review, approved, returned, escalated counts)
- Return-to-agent flow with specific fix requests and reason tracking
- Escalation to principal broker for complex issues
- File approval with digital stamp (Principal Broker+ role required)
- Approved file export as PDF with audit trail
- Pagination, filtering by status, sorting by priority/closing date/readiness score

#### AI Pre-Review Engine (Gateway API)
- Automated pre-review scanning across 5 categories:
  - Completeness: checks all required document types are present
  - Signatures: verifies all signing envelopes are fully signed
  - Dates: validates closing dates and document expiry
  - Names: cross-checks buyer/seller consistency across documents
  - Compliance: validates checklist completion status
- Severity classification: Critical (must fix), Warning (should review), Info (suggestion)
- Readiness score calculation (0-100) based on finding severity weights
- Rule references with jurisdiction (e.g., ORS 93.275, RESPA Section 8)
- Per-document finding linkage for precise issue location

#### AI Learning Engine (Gateway API)
- Broker feedback on AI findings (correct, false_positive, missed_issue, severity_adjustment)
- Feedback loop that adjusts AI confidence over time
- Promote common broker flags to permanent brokerage rules
- Per-finding action tracking (approved, flagged, dismissed, promoted_to_rule)

#### Agent Coaching Insights (Gateway API)
- AI-detected recurring patterns per agent across review history
- Insight types: recurring_issue, improvement, coaching_tip, pattern_detected
- Occurrence counting with example transaction references
- Coaching reminder dispatch tracking
- Generate insights from historical review data

#### Review Findings Management (Gateway API)
- Add manual broker findings during file review
- Take action on findings (approve, flag, dismiss, promote to rule)
- Auto-create AI feedback records when dismissing AI findings
- Finding resolution tracking with user attribution
- Broker notes per finding

#### Frontend — Broker Review Queue Dashboard
- Stat cards: Pending, In Review, Approved This Week, Returned counts
- Filter tabs: All, Pending, In Review, Returned, Escalated
- Sort controls: Priority, Closing Date, Readiness Score
- Review queue cards with priority indicators (color-coded dots)
- Readiness score circular progress indicators (red/yellow/green)
- Finding severity badges (critical/warning/info counts)
- Start Review and View quick actions
- Empty state with illustration

#### Frontend — Transaction Review Detail
- Readiness score hero display (large circular 0-100 indicator)
- AI Pre-Review summary card with finding counts and re-scan button
- Findings list grouped by severity (Critical → Warning → Info)
- Per-finding action buttons: Approve, Flag, Dismiss, Promote to Rule
- Source badges (AI Pre-Review, Broker Manual, Compliance Engine)
- Document reference and rule/jurisdiction display per finding
- Add Manual Finding form with category, severity, title, description
- Document checklist with signed/compliance status per document
- Sticky action bar: Approve File, Return to Agent, Escalate, Export
- Return-to-agent modal with reason input and agent selector

#### Frontend — Agent Coaching Insights
- Agent selector dropdown for brokerage team
- Insight cards with type-specific icons (recurring, improvement, tip, pattern)
- Occurrence count and last-seen date display
- Example transaction links per insight
- Send Reminder and Dismiss actions
- Generate Insights button to analyze agent history
- Summary stats: total insights, recurring issues, improvements

#### Frontend — Navigation
- Added "Review Queue" nav item with ClipboardCheck icon (Managing Broker+ visibility)

#### Infrastructure Updates
- Gateway schema.ts updated with 4 new Phase 4 table exports (27 total)
- Gateway index.ts updated with 2 new route groups (review-queue, ai-review)
- 6 new SQL migrations (0032-0037) with RLS policies and triggers

## [v0.3.0] - 2026-02-15

### Added — Phase 3: E-Signatures & Closing

#### Database Schema (8 New Tables + 1 Extended)
- Signing envelopes table for grouping documents into signing packages
- Signing requests table with per-signer tokens, link expiry, and status tracking
- Signature fields table for positioning signature/initial/date fields on documents
- Signatures table with HMAC-SHA256 tamper seals and certificate references
- Certificates of completion table with PDF path, hash, and jurisdiction info
- Signing audit log table (immutable, insert-only) for signing event tracking
- Closing packages table for assembling final transaction document bundles
- State signing rules table for jurisdiction-specific signing requirements
- Extended documents table with file_hash, requires_signature, signature_status, signing_deadline
- Row-Level Security policies for all Phase 3 tables
- Updated_at triggers for automatic timestamp management

#### Signing Envelope Management (Gateway API)
- Create signing envelopes with document selection and deadline
- Send envelopes to signers with unique secure tokens (32-byte random)
- Per-signer signing requests with 7-day link expiry
- State compliance auto-detection (witness/notary requirements from state rules)
- Envelope status lifecycle: draft → sent → in_progress → fully_signed → cancelled
- Signer status tracking: pending → sent → opened → signed → declined
- Send reminder emails to pending signers
- Add witness signers to envelopes (required for some Oregon document types)
- List and filter envelopes by transaction
- State signing rules lookup endpoint

#### Public Signing Experience (Gateway API — No Auth)
- Token-based signing access (no account required for signers)
- Mark-as-opened tracking with IP and device info
- Signature submission with full name, typed/drawn signature, and consent
- HMAC-SHA256 tamper seal generation for each signature
- Signing completion with automatic envelope status rollup
- Decline-to-sign flow with reason capture
- IP address and user agent logging for legal compliance
- Signing link expiry validation

#### Closing Package Management (Gateway API)
- Create closing packages with document selection and ordering
- Package status lifecycle: draft → assembling → ready_for_review → approved → submitted_to_title → recorded
- Submit to title company workflow
- Final approval by Principal Broker+ with permission check
- Signature verification endpoint with tamper seal validation
- Table of contents generation
- PDF and ZIP archive path tracking

#### E-Signature Cryptographic Service (Rust/Actix-Web)
- SHA-256 document hashing endpoint
- HMAC-SHA256 tamper seal generation using configurable secret key
- Tamper seal verification with constant-time comparison (timing-attack resistant)
- Signature hash generation (signer name + document ID + timestamp)
- Certificate of completion hash generation
- Health check endpoint
- Dockerfile with multi-stage Rust build (1.77-slim builder, bookworm-slim runtime)
- Runs on port 8020

#### State Signing Rules (Seed Data — Oregon + Federal)
- Oregon purchase agreement rules (e-signature allowed, consent required)
- Oregon property condition disclosure (witness not required)
- Oregon agency disclosure (e-signature allowed)
- Oregon lead-based paint disclosure (e-signature allowed)
- Federal baseline rules for all document types
- Notary and remote notary requirements per document type
- Wet signature vs. e-signature allowance per jurisdiction
- Record retention period requirements (5-10 years by type)

#### Frontend — Signing Dashboard
- Signing dashboard per transaction with envelope management
- Create envelope modal with document selector and signer list
- Envelope cards with expand/collapse showing signer progress
- Signer status cards with role, email, and signing timestamp
- Status summary grid (Draft, Sent, In Progress, Fully Signed counts)
- Send reminder and resend link quick actions
- Signing event timeline with chronological activity feed
- Real-time data refresh with React Query

#### Frontend — Public Signing Experience
- Standalone public signing page (no dashboard layout, no auth required)
- CrestDesk branded header with logo
- Document list display with signing consent checkbox
- UETA/ESIGN Act consent agreement
- Type-to-sign and draw-to-sign signature input modes
- Full name confirmation for legal compliance
- Decline-to-sign flow with reason input
- Success confirmation with certificate of completion reference
- Expired/invalid token error handling

#### Frontend — Closing Package Assembly
- Closing package management page per transaction
- Create package modal with document selection
- Package status cards with progress summary
- Document ordering display with signing status indicators
- Submit to Title Company workflow
- Final approval button (Principal Broker+ role gate)
- Download PDF and ZIP archive links
- Status badge color coding for all package states

#### Infrastructure Updates
- Gateway schema.ts updated with 8 new Phase 3 table exports (23 total)
- Gateway index.ts updated with 3 new route groups (signing, sign, closing-packages)
- 11 new SQL migrations (0021-0031) with RLS policies and triggers

## [v0.2.0] - 2026-02-15

### Added — Phase 2: Documents & Forms

#### Database Schema (7 New Tables)
- Transactions table with property address, state, buyer/seller, price, status lifecycle
- Documents table with S3 storage, AI classification, extracted data, compliance status
- Forms table for reusable form templates with HTML templates and JSON schemas
- Form instances table linking filled forms to transactions
- Compliance checklists table with per-transaction, per-jurisdiction checklist items
- Document tags table for flexible document organization
- Document audit log table (immutable, insert-only) for document access tracking
- Row-Level Security policies for all Phase 2 tables
- Updated_at triggers for automatic timestamp management

#### Transaction Management (Gateway API)
- Full transaction CRUD (create, list, get, update, soft-delete)
- Pagination, search by address, filter by status and state
- Transaction types: buy, sell, lease, investment
- Status lifecycle: draft → active → under_contract → pending → closed → canceled

#### Document Management (Gateway API)
- Document upload with S3 presigned URL generation
- Document listing with filters (transaction, type, compliance, signed status)
- Full-text search across document filenames, types, and extracted data
- Document classification (manual override) with confidence scoring
- Document tagging system (add tags by key/value)
- Document download with presigned URL and audit logging
- Per-transaction document listing
- Document versioning via version_of_document_id links
- Document audit trail (upload, view, download, classify, delete events)

#### Forms Engine (Gateway API)
- Form template listing with jurisdiction and type filters
- State-specific form retrieval (e.g., Oregon forms for OR transactions)
- Custom form template creation (Principal Broker+)
- Form instance creation, update, and validation
- Auto-fill from transaction data (buyer, seller, address, price)
- Required field validation with missing field reporting
- Form completion status tracking

#### Compliance Checklists (Gateway API)
- Auto-generated checklists when accessing a transaction (based on state)
- Oregon-specific checklist with 12 items (federal + state)
- Federal checklist template for all other states (5 items)
- Individual item check/uncheck with user tracking and timestamps
- Automatic status recalculation (federal complete, state complete, overall)
- Checklist status summary endpoint with progress percentages
- Color-coded status: red (missing), green (complete)

#### AI Document Service (Python/FastAPI)
- Document classification endpoint using Claude AI (17 document types)
- Data extraction endpoint (buyer, seller, address, price, dates, terms)
- OCR endpoint for scanned PDFs and images (pytesseract + Pillow)
- Compliance checking endpoint with jurisdiction-aware rule evaluation
- PDF text extraction with pypdf
- Structured JSON responses with confidence scores
- Health check endpoint
- Dockerfile with Tesseract OCR system dependency

#### Oregon Form Templates (Seed Data)
- Oregon Purchase Agreement (NAR standard)
- Oregon Seller Property Condition Disclosure (ORS 93.275)
- Oregon Lead-Based Paint Disclosure (ORS 93.705)
- Oregon Agency Disclosure (ORS 696.600)
- Oregon Buyer Information Sheet
- Oregon HOA Disclosure Addendum
- Oregon Inspection Addendum
- Oregon Financing Addendum
- Oregon Counter Offer
- Oregon Post-Inspection Repairs Addendum

#### Frontend — Document Hub
- Document hub page with search, filters, table view, upload button
- Document detail page with metadata, extracted data, compliance status, tags
- Drag-and-drop document upload page with AI classification results
- Advanced document search page with multi-filter panel
- Per-document compliance status indicators (green/yellow/red)

#### Frontend — Transaction Management
- Transaction list page with search, status filter tabs, card grid view
- New transaction creation modal
- Transaction detail page with tabbed view (Documents, Forms, Compliance, Activity)
- Document folder tree view per transaction

#### Frontend — Forms
- Forms library page with jurisdiction and type filters
- Form filling page with dynamic field rendering from JSON schema
- Required field validation with visual indicators
- Clause library sidebar for one-click insertion
- Auto-fill from transaction data
- Save draft and validate actions

#### Frontend — Compliance
- Compliance checklist page with federal and state sections
- Progress bars (federal %, state %)
- Interactive checkboxes with real-time status updates
- Statute references for each checklist item
- Color-coded status indicators

#### Frontend — Email Integration Settings
- Connected email accounts management (Gmail/Outlook OAuth placeholders)
- Transaction email address display with copy-to-clipboard
- Auto-filing rules configuration with confidence threshold
- Sender-to-role mapping rules

#### Frontend — Navigation
- Added Forms nav item with ClipboardList icon to sidebar

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
