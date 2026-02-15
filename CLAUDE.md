# CLAUDE.md — CrestDesk Repository Instructions for Claude Code
# This file lives at the root of the monorepo and tells Claude Code how to work in this project.

## PROJECT OVERVIEW
CrestDesk is an all-in-one real estate transaction platform built for Coastal Crest Realty LLC.
Multi-language monorepo: TypeScript (frontend + core services), Python (AI services), Rust (crypto + media encoding).
Monorepo managed by Turborepo. All services are containerized with Docker.

## CRITICAL RULES — NEVER VIOLATE THESE
1. NEVER commit secrets, API keys, passwords, or tokens to code. All secrets go in environment variables loaded from AWS Secrets Manager.
2. NEVER disable or weaken Row-Level Security policies. Every table with tenant_id MUST have RLS enabled and enforced.
3. NEVER bypass the compliance engine. All user-facing content (emails, social posts, documents, media) MUST pass through compliance checking before delivery.
4. NEVER use localStorage or sessionStorage for auth tokens. Access tokens live in memory only. Refresh tokens are httpOnly secure cookies.
5. NEVER write database migrations that drop columns or tables without explicit approval. Use soft deletes (deleted_at) for all user data.
6. ALL code must pass linting before commit. No lint exceptions without a comment explaining why.
7. ALL new endpoints must have at least one unit test and one integration test before merge.
8. ALL database queries must be parameterized. No string concatenation in SQL. Ever.

## LANGUAGES & CONVENTIONS

### TypeScript (apps/ and services/ except ai-* and esign/)
- Style: ESLint + Prettier (config in packages/config/)
- Semicolons: yes
- Quotes: single
- Indent: 2 spaces
- Trailing commas: all
- Import order: node builtins → external packages → internal packages → relative imports (enforced by eslint-plugin-import)
- File naming: kebab-case for files (user-service.ts), PascalCase for components (UserProfile.tsx)
- Export style: named exports preferred. Default export only for React page components and Next.js pages.
- Error handling: All async functions use try/catch. Never swallow errors silently. Log with structured logger.
- Types: No `any` type. Use `unknown` if type is genuinely unknown, then narrow.
- Null handling: Use nullish coalescing (??) and optional chaining (?.). Never use == null, always === null || === undefined.

### Python (services/ai-*, services/compliance/, services/preference-engine/)
- Style: Black (formatter) + Ruff (linter)
- Line length: 88 (Black default)
- Type hints: Required on all function signatures. Use modern syntax (str | None, not Optional[str]).
- Import order: stdlib → third-party → local (enforced by Ruff isort)
- File naming: snake_case for everything
- Docstrings: Google style on all public functions
- Error handling: Custom exception classes per service. Never bare except.
- Async: Use async/await with FastAPI. No blocking calls in async endpoints.
- Testing: pytest with fixtures. No unittest.TestCase.

### Rust (services/esign/, services/media-encoder/)
- Style: rustfmt + Clippy (all warnings enabled)
- Error handling: Use thiserror for library errors, anyhow for application errors. No unwrap() in production code — use expect() with descriptive message or proper error propagation with ?.
- Naming: snake_case for functions/variables, PascalCase for types/traits, SCREAMING_SNAKE_CASE for constants.
- Unsafe: Never use unsafe blocks without a safety comment and review.
- Dependencies: Minimal. Justify every new crate in PR description.

### SQL (packages/db/migrations/)
- Keywords: UPPERCASE (SELECT, FROM, WHERE, NOT NULL)
- Table names: snake_case, plural (users, sessions, compliance_rules)
- Column names: snake_case (created_at, tenant_id)
- Indexes: idx_tablename_columns (idx_users_tenant, idx_audit_resource)
- Migrations: Sequential numbered files (0001_create_tenants.sql, 0002_create_users.sql)
- Every migration must be reversible. Include both up and down.
- Test migrations against empty database AND against database with existing data.

## FILE STRUCTURE RULES
- Each service is self-contained in its directory. No reaching into another service's source code.
- Shared code goes in packages/ (types, utils, config, ui, db).
- Frontend components organized by feature, not by type. Example: components/auth/LoginForm.tsx, not components/forms/LoginForm.tsx.
- One component per file. File name matches component name.
- Tests live next to the code they test: user-service.ts → user-service.test.ts
- No barrel exports (index.ts re-exporting everything). Import from specific files.

## GIT CONVENTIONS
- Branch naming: feature/CD-123-add-mfa-setup, fix/CD-456-rls-policy-leak, chore/CD-789-update-deps
- Commit format: Conventional Commits (feat:, fix:, docs:, test:, chore:, refactor:, security:)
- Scope in parentheses matches service name: feat(gateway): add rate limiting
- PR titles match commit format
- Squash merge to main. One commit per PR in main branch history.
- Never push directly to main. Always PR with at least one review.

## DATABASE RULES
- All tables must have: id (uuid PK), created_at (timestamptz), updated_at (timestamptz)
- All tenant-scoped tables must have: tenant_id (uuid FK, NOT NULL) with RLS policy
- Soft delete via deleted_at (timestamptz, NULL). Never hard delete user data.
- JSONB for flexible/extensible fields (preferences, settings, metadata). Keep structured data in proper columns.
- Indexes: add for any column used in WHERE, JOIN, or ORDER BY. Partial indexes where appropriate (WHERE deleted_at IS NULL).
- Foreign keys: always with ON DELETE RESTRICT (never CASCADE on production tables without explicit approval).

## API RULES
- All endpoints prefixed with /api/v1/
- Request validation using Zod schemas at the gateway level
- Response format: { data: T } for success, { error: { code, message, details, request_id } } for errors
- Pagination: cursor-based preferred, offset-based acceptable. Always include total count.
- Rate limiting headers on every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Audit log: every mutating action (POST, PATCH, PUT, DELETE) logged asynchronously
- CORS: configured per environment. Development: localhost origins. Production: coastalcrest.net subdomains only.

## TESTING RULES
- Unit tests: test one function/module in isolation. Mock external dependencies.
- Integration tests: test service + real database (use testcontainers). Test RLS policies.
- E2E tests: test full user flows through the UI with Playwright.
- Compliance tests: every compliance rule has a dedicated test. Adding a rule without a test is not allowed.
- Test naming: describe what the test verifies, not what it does. "should reject login with invalid password" not "test login".
- Test data: use factories/fixtures. Never hardcode UUIDs or timestamps in tests.

## WHEN IN DOUBT
- Prioritize security over convenience
- Prioritize data integrity over performance
- Prioritize user experience over developer experience
- Prioritize compliance correctness over speed of delivery
- Ask for clarification rather than guessing on business logic
- Check the Build Plans folder on D:/Crest Desk/ for architectural decisions and feature specs
