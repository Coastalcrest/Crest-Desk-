# ADR 0001: Use PostgreSQL RLS for Multitenancy
Date: 2026-02-15 | Status: Accepted

## Context
CrestDesk is a SaaS platform serving multiple brokerages. Each brokerage's data must be strictly isolated from others — agents at Brokerage A must never see data belonging to Brokerage B. Three approaches were evaluated:

1. **Separate databases per tenant** — strongest isolation but operationally expensive. Each migration must run against every database. Connection pooling becomes complex at scale.
2. **Schema-per-tenant** — moderate isolation with simpler connection management, but migrations still multiply and tooling support is inconsistent.
3. **Row-Level Security (RLS)** — single database, single schema, with PostgreSQL-native policies enforcing row-level filtering based on a `tenant_id` column.

The platform targets hundreds of brokerages with thousands of agents. Operational simplicity and a single migration path are critical at this stage.

## Decision
Use PostgreSQL Row-Level Security with a `tenant_id` column on every tenant-scoped table. All data lives in a single database with a single schema. RLS policies enforce that queries only return rows matching the current tenant context.

- Every tenant-scoped table includes a `tenant_id UUID NOT NULL` column with a foreign key to the `brokerages` table.
- RLS is enabled on every tenant-scoped table with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Policies use `current_setting('app.current_tenant_id')` to filter rows.
- The application sets `app.current_tenant_id` via `SET LOCAL` at the start of every database transaction.
- A superuser/service role bypasses RLS for cross-tenant operations like billing and analytics.

## Consequences

**Positive:**
- Single database simplifies backups, monitoring, and connection pooling.
- One migration path — schema changes apply to all tenants atomically.
- PostgreSQL-native enforcement means even raw SQL queries respect tenant boundaries.
- No application-level WHERE clause filtering needed (though defense-in-depth is still applied).
- Scales well with connection pooling (PgBouncer) since all tenants share one database.

**Negative:**
- Every request must set `app.current_tenant_id` before any database operation. Forgetting this leaks data across tenants.
- RLS policies must be tested thoroughly — a misconfigured policy silently exposes data.
- Cross-tenant queries (admin dashboards, billing) require careful role management to bypass RLS safely.
- Performance: every query includes an implicit filter. Indexes on `tenant_id` are mandatory.
- Noisy-neighbor risk: one tenant's heavy queries can affect others. Mitigated by connection pooling limits and query timeouts.
