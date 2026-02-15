# Changelog

All notable changes to CrestDesk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
