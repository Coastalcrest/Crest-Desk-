# Changelog

All notable changes to CrestDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.8.0] - 2026-02-15

### Added — Phase 8: Social Marketing

#### Database Schema (5 New Tables)
- Social accounts table for OAuth-connected platforms (Facebook, Instagram, LinkedIn, YouTube, TikTok, X, Google Business) with token management and connection health
- Social posts table for AI-generated and manual posts with compliance screening, approval workflow, scheduling, A/B test groups, and content variations
- Social engagement table for per-post analytics (impressions, reach, likes, comments, shares, clicks, video views, leads) with platform-specific metrics
- Social content rules table for auto-publish rules, broker approval requirements, compliance templates, and branding defaults per post type/platform
- Social campaigns table for multi-platform campaign management with engagement totals, evergreen content, and content strategy
- Row-Level Security policies and updated_at triggers for all Phase 8 tables

#### Social Post Management (Gateway API — 16 endpoints)
- Paginated post list with filters by agent, platform, post type, status, transaction, date range
- Post stats: total, published this month, scheduled, pending approval, impressions, engagement, top platform
- Calendar view: posts grouped by date for monthly content calendar
- Create, update, and soft-delete posts with content variations and media assets
- AI content generation with platform-optimized captions, 3 variations, and hashtag strategy
- Bulk scheduling: auto-generate posts across platforms for a date range
- Compliance check: screen for disclaimers, license numbers, fair housing, state advertising rules
- Broker approval/rejection workflow (Managing Broker+)
- Immediate publish and reschedule endpoints
- Approval queue and milestone auto-generation from transaction events

#### Social Analytics & Platform Management (Gateway API — 14+ endpoints)
- Platform account CRUD with OAuth token refresh and connection health monitoring
- Per-post engagement metrics and aggregate summary (impressions, reach, engagement by platform, top posts)
- Monthly engagement trend data (12 months)
- Campaign CRUD with content strategy and engagement aggregation
- Content rules CRUD (Managing Broker+) for auto-publish and approval configuration
- ROI attribution: social engagement → leads → closed deals → revenue

#### Frontend — Social Marketing Dashboard
- Stat cards, content calendar grid, upcoming posts, quick actions, platform health indicators

#### Frontend — Post Composer
- Multi-platform selector, post type selector, rich content editor with character counts
- AI generate with 3 caption variations, hashtag editor, media attachment, platform preview
- Schedule controls and compliance status

#### Frontend — Social Analytics
- Date range picker, platform breakdown, top posts table, monthly trends, lead attribution, ROI summary

#### Frontend — Campaign Manager
- Campaign list with type/platform/status badges, create campaign modal, engagement summaries

#### Frontend — Approval Queue
- Pending posts with compliance indicators, approve/reject/edit actions, batch approve

#### Frontend — Platform Connections Manager
- 7 platform cards with connection status, health indicators, content rules configuration

#### Infrastructure Updates
- Gateway schema.ts updated with 5 new Phase 8 table exports (49 total)
- Gateway index.ts updated with 2 new route groups (social-posts, social-analytics)
- 7 new SQL migrations (0061-0067) with RLS policies and triggers

## [v0.7.0] - 2026-02-15

### Added — Phase 7: AI Media Studio

#### Database Schema (4 New Tables)
- Media assets table for AI-generated images, videos, and graphics with compliance tracking, generation prompts, publishing status, and S3 file paths
- Asset library table for royalty-free stock photos, icons, backgrounds, music, sound effects, fonts, and animations with seasonal collections and download tracking
- Media templates table for reusable generation templates (listing graphics, social graphics, tour videos, market updates) with configurable output formats and dimensions
- Agent media preferences table for learned style preferences, color choices, branding defaults, and favorite templates/assets
- Row-Level Security policies for all Phase 7 tables (asset_library and media_templates allow global/shared items via NULL tenant_id)
- Updated_at triggers for automatic timestamp management

#### Media Asset Management (Gateway API — 13 endpoints)
- Paginated media asset list with filters by agent, asset type (image/video/audio/graphic), media type, status, compliance status, and transaction
- Media stats: total assets, image count, video count, generated this month, published count, pending compliance
- AI image generation: accepts prompt, template, branding, and overlay params; creates draft asset with generation metadata
- AI video generation: accepts storyboard scenes, music, voiceover, captions; creates draft asset
- Batch generation: full marketing set for a listing (Just Listed, social graphics, tour video) in one request
- Single asset detail, update (title/tags/metadata), and soft-delete
- Compliance check: simulates screening for disclaimers, license numbers, fair housing, virtual staging disclosure
- Broker approval workflow: approve or reject media with reason tracking (Managing Broker+)
- Publish to platforms: mark as published with platform list and timestamp
- Compliance review queue: pending assets for broker review (Managing Broker+)

#### Asset Library & Templates (Gateway API — 14 endpoints)
- Library asset list with filters by category, subcategory, license type, seasonal, tags, and search
- Category listing with asset counts
- Seasonal asset recommendations (based on current month)
- AI-powered asset recommendations based on agent preferences
- Upload custom assets to library (Managing Broker+ for global)
- Library asset detail, update, and soft-delete
- Download tracking with count increment
- Template CRUD: list, create, detail, update, delete (Managing Broker+ for create/update/delete)
- Template filters: type (listing_graphic, social_graphic, tour_video, etc.), category, global, premium
- Agent media preferences: get and update preferred styles, music mood, colors, branding, favorites

#### Frontend — Media Studio Dashboard
- Hero section with gradient background and "AI Media Studio" heading
- Quick action cards: Generate Image, Create Video, Browse Library (large icon cards)
- Recent Projects grid with thumbnails, type badges, status badges, and dates
- Templates carousel: Just Listed, Under Contract, Just Sold, Market Update, Social Post
- Stats row: Images Generated, Videos Created, Published, Pending Review
- Favorites section with recently favorited assets

#### Frontend — Image Generator
- Project type sidebar: Listing Graphic, Social Graphic, Virtual Staging, Property Enhancement, Custom
- Center workspace with large preview area
- Right panel: property selector, branding toggle, color scheme, overlay text, style selector
- Generate/regenerate buttons with variation support
- Generated results carousel with select/download/publish actions
- Compliance status indicator (green check or yellow warning)
- Template selector dropdown

#### Frontend — Video Generator
- Video type tabs: Tour Video, Market Update, Testimonial, Agent Intro, Custom
- Storyboard area with draggable scene cards (thumbnail, duration, text overlay)
- Settings panel: music mood selector, voiceover toggle, captions toggle, branding options
- Preview area with play button overlay
- Output format selector: 15s Reels, 30s Stories, 60s YouTube
- Generate button with progress bar
- Generated videos section with preview, download, publish buttons

#### Frontend — Asset Library
- Category tabs: All, Stock Photos, Icons, Backgrounds, Music, Sound Effects, Fonts, Animations
- Search with filters (category, mood, color, seasonal, license)
- Grid of asset cards with thumbnails, names, category badges, download counts, license badges
- Hover actions: Use and Favorite buttons
- AI "Recommended for You" sidebar
- Seasonal collection banner
- Upload button for custom assets
- Pagination controls

#### Frontend — Compliance Review Queue
- Stat cards: Pending Review, Approved Today, Issues Found
- Filter tabs: All, Pending, Passed, Failed
- Media review cards with thumbnails, agent name, media type, compliance status
- Expandable compliance issue list with rule references and suggested fixes
- Action buttons: Approve, Request Revisions, Reject
- Batch approve mode

#### Frontend — Generated Media History
- Timeline view with date headers
- Media history cards: thumbnail, title, type, status, compliance status, published platforms
- Filters: type, status, date range, agent
- Actions: View, Regenerate, Download, Delete
- Stats summary: Total Generated, Total Published, Compliance Pass Rate

#### Frontend — Navigation
- Added "Media Studio" nav item with Wand2 icon (visible to all roles)

#### Infrastructure Updates
- Gateway schema.ts updated with 4 new Phase 7 table exports (44 total)
- Gateway index.ts updated with 2 new route groups (media, asset-library)
- 6 new SQL migrations (0055-0060) with RLS policies and triggers

## [v0.6.0] - 2026-02-15

### Added — Phase 6: QuickBooks & Financial Integration

#### Database Schema (5 New Tables)
- Commission structures table for configurable brokerage/agent split percentages by deal type with effective dates
- Commission splits table for per-deal commission calculation with gross/net tracking, QB sync status, and correction lineage
- Vendors table with contact info, payment terms, 1099 tracking, performance ratings, and turnaround metrics
- Deal expenses table with category-based tracking (photography, staging, marketing, inspection, etc.), receipt data, and IRS category codes
- Agent billing table for desk fees, E&O insurance, tech fees with billing period, due date, and payment status
- Row-Level Security policies for all Phase 6 tables
- Updated_at triggers for automatic timestamp management

#### Commission Management (Gateway API — 10 endpoints)
- Paginated commission list with filters by agent, status, deal type, date range, and sorting
- Commission stats: YTD total, this month, pending count, average deal, top 5 agents by YTD commission
- Pending income projections from active pipeline with probability-weighted calculations
- Create commission splits from closed deals with automatic structure-based split calculation
- Commission correction workflow: creates new record linked to original via correctedFromId with reason tracking
- QuickBooks sync marking with invoice ID and account code tracking
- Commission structure CRUD: default and agent-specific structures by deal type (Managing Broker+)

#### Expense Management (Gateway API — 11 endpoints)
- Paginated expense list with filters by deal, agent, vendor, category, paid status, date range
- Expense stats: YTD total, this month, top categories, expense-to-revenue ratio
- Expenses by deal and by agent aggregation endpoints
- Full CRUD with soft-delete for deal expenses
- Mark-as-paid workflow with payment date tracking
- QuickBooks sync marking per expense
- Bulk CSV upload for batch expense creation
- Expense categories: photography, staging, marketing, inspection, appraisal, title, recording, other

#### Vendor Management (Gateway API — 6 endpoints)
- Vendor list with search, type filter, and pagination
- Full CRUD for vendors (Managing Broker+ for create/update)
- Vendor payment history via deal expense aggregation
- 1099 report: all vendors requiring 1099 forms with YTD payment totals
- Vendor types: photography, staging, inspector, appraiser, title, lender, other

#### Agent Billing (Gateway API — 6 endpoints)
- Billing record list with filters by agent, type, status, date range
- Outstanding balance report with aging buckets (current, 30+, 60+, 90+ days) — Managing Broker+
- Create billing invoices (Managing Broker+): desk fees, E&O insurance, tech fees, custom
- Mark invoices as paid with automatic payment date
- Auto-generate invoices for billing period across selected or all agents (Managing Broker+)

#### Financial Reporting (Gateway API — 6 endpoints)
- Commission dashboard: YTD total, this month, by agent (ranked), by deal type, monthly trend (12 months), pending
- Expense summary: YTD total, this month, by category, by agent, monthly trend, expense ratio
- Agent billing dashboard: total outstanding, aging report, per-agent breakdown
- P&L by office: total revenue (commissions), total expenses, gross profit, profit margin, monthly trend
- Tax preparation: 1099 vendor list with YTD payments, income summary by category, expense summary by IRS category
- Reconciliation: pending QB sync count, last sync date, unsynced commissions and expenses

#### Frontend — Commission Dashboard
- 4 stat cards: YTD Commission, This Month, Pending Commission, Avg Deal Commission
- Commission by Agent ranked table with YTD totals and deal counts
- Monthly trend display (last 6 months with amounts)
- Commission by deal type breakdown (Residential, Commercial, Rental)
- Filter bar: date range, agent selector, deal type
- Export CSV button

#### Frontend — Expense Dashboard
- 3 stat cards: YTD Expenses, This Month, Expense-to-Revenue Ratio
- Expenses by category breakdown with amounts
- Recent expenses table with date, description, category, deal, agent, amount, status
- Add Expense modal with full form fields
- Filter: category, agent, paid status, date range

#### Frontend — Vendor Management
- Vendor list table with name, type, YTD payments, turnaround, star rating, 1099 badge
- Search and type filter
- Add Vendor modal
- Expandable payment history per vendor
- Sort by name, spending, rating

#### Frontend — Agent Billing Dashboard
- 3 stat cards: Total Outstanding, Overdue, Collected This Month
- Aging summary: Current, 30+, 60+, 90+ Days with dollar amounts
- Agent billing table with amount due, due date, type, status badge
- Mark Paid and Create Invoice actions
- Filter: billing type, status

#### Frontend — P&L by Office
- Office/Entity selector dropdown
- Large cards: Total Revenue, Total Expenses, Gross Profit, Net Profit (color-coded)
- Profit margin percentage display
- Monthly P&L table with full breakdown
- Year selector

#### Frontend — Tax Preparation
- 1099 Vendors table with YTD payments and requirement flags
- Income summary by category
- Expense summary by IRS deductible category
- Year selector and CSV/PDF export buttons
- CPA Notes text area

#### Frontend — Financial Settings
- Commission structure configuration: default and agent-specific overrides
- QuickBooks connection status indicator
- Account mapping list (category → QB account code)
- Connect/Test/Sync buttons for QB integration

#### Frontend — Navigation
- Added "Finance" nav item with DollarSign icon (visible to all roles)

#### Infrastructure Updates
- Gateway schema.ts updated with 5 new Phase 6 table exports (40 total)
- Gateway index.ts updated with 5 new route groups (commissions, expenses, vendors, billing, reports)
- 7 new SQL migrations (0048-0054) with RLS policies and triggers

## [v0.5.0] - 2026-02-15

### Added — Phase 5: CRM & Follow-Up

#### Database Schema (8 New Tables)
- Contacts table with multi-channel communication (email, phone, SMS), social profiles, family info, contact scoring, tagging, and lifecycle tracking
- Contact activities table for full timeline (email, call, SMS, meeting, note, showing, offer, closing, task, referral)
- Pipeline stages table for customizable Kanban deal board with sort ordering and color coding
- Deals table with stage progression, value tracking, probability, expected close date, and contact/transaction linking
- Follow-up sequences table for multi-step automated drip campaigns (lead_nurture, active_transaction, post_close, re_engagement, custom)
- Follow-up enrollments table for contact-to-sequence assignments with pause/resume/cancel lifecycle
- Follow-up messages table for individual message tracking with delivery status, channel support, and scheduling
- Lead sources table for attribution tracking with auto-assign rules and round-robin distribution
- Row-Level Security policies for all Phase 5 tables
- Updated_at triggers for automatic timestamp management

#### Contacts Management (Gateway API)
- Paginated contact list with search, filter by type/source/tag/owner, and sort by name/score/created/updated
- Contact stats: total, new this month, active deals, upcoming follow-ups
- Full CRUD: create, read, update, soft-delete contacts
- Activity timeline: log activities (email, call, SMS, meeting, note, showing, offer, closing) with attachments
- Activity history with pagination per contact
- Tag management: add/remove tags per contact
- Bulk CSV import with upsert logic (match by email)
- Enroll contact in follow-up sequence directly from contact detail

#### Pipeline & Deals (Gateway API)
- Pipeline stage management: list stages, create custom stages (Managing Broker+)
- Deal list with filters by stage, owner, contact, deal type, and sort by value/probability/close date
- Deal stats: total active deals, total pipeline value, average deal value, won/lost counts
- Full CRUD: create, read, update, soft-delete deals
- Drag-and-drop stage movement endpoint for Kanban board

#### Follow-Up Engine (Gateway API)
- Sequence CRUD: create multi-step automated sequences with step definitions (channel, delay, template, subject)
- Enrollment management: enroll contacts, pause, resume, cancel enrollments
- Process due messages: batch processor identifies and sends due messages based on enrollment start + step delays
- Message status tracking: pending → sent → delivered → opened → clicked → replied (or failed/bounced)
- Follow-up analytics: messages by status, delivery rate, open rate, click rate, reply rate
- Per-enrollment progress tracking with current step and next send time

#### Lead Sources (Gateway API)
- Lead source list and CRUD (Managing Broker+ for create/update)
- Source types: website, zillow, realtor_com, redfin, referral, open_house, social_media, paid_ads, cold_call, walk_in, other
- Lead ingestion endpoint: accept inbound leads with auto-assignment via round-robin distribution
- Auto-create contacts from ingested leads with source attribution
- Per-source performance analytics: total leads, converted count, conversion rate, average response time

#### Frontend — Contacts Dashboard
- Contacts list with search bar, type/source filter dropdowns, and grid/list toggle
- Stat cards: Total Contacts, New This Month, Active Deals, Upcoming Follow-Ups
- Contact cards with avatar, name, type badge, contact score indicator, tags, and quick actions
- Pagination controls with page size selector
- Add Contact modal with full form fields

#### Frontend — Contact Detail
- Contact profile header with avatar, name, type, score, and lifecycle stage
- Multi-tab layout: Overview, Activities, Deals, Sequences, Documents
- Activity timeline with type-specific icons and chronological ordering
- Log Activity form with type selector and notes field
- Tag management inline editing
- Quick actions: Edit, Delete, Enroll in Sequence

#### Frontend — Pipeline Board
- Kanban-style pipeline view with draggable deal cards across stages
- Deal cards showing contact name, value, probability, expected close date
- Stage columns with deal count and total value summaries
- Add Deal modal with contact selector, stage, value, and probability fields
- Filter bar: deal type, owner, date range
- Stats row: Total Deals, Pipeline Value, Average Deal, Won/Lost ratio

#### Frontend — Follow-Up Sequences
- Sequence list with type badges (lead_nurture, post_close, etc.)
- Sequence detail with step visualization (channel icon, delay, subject preview)
- Enrollment list per sequence with status indicators
- Create/edit sequence form with multi-step builder
- Active enrollment count and completion rate per sequence

#### Frontend — Lead Sources
- Lead source list with source type icons and performance metrics
- Source performance cards: total leads, conversion rate, avg response time
- Create/edit source form with auto-assign and distribution rule configuration
- Lead ingestion activity feed

#### Frontend — Navigation
- Added "Pipeline" nav item with Kanban icon (visible to all roles)

#### Infrastructure Updates
- Gateway schema.ts updated with 8 new Phase 5 table exports (35 total)
- Gateway index.ts updated with 4 new route groups (contacts, deals, follow-up, lead-sources)
- 10 new SQL migrations (0038-0047) with RLS policies and triggers

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
