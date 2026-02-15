# ADR 0002: Monorepo with Turborepo
Date: 2026-02-15 | Status: Accepted

## Context
The CrestDesk platform consists of 16+ services spanning three programming languages: TypeScript (API gateway, web app, most services), Python (AI/ML services, compliance engine), and Rust (e-signature, media encoding). These services share types, configuration schemas, protobuf definitions, and utility libraries.

With a polyrepo approach, keeping shared types synchronized across repositories becomes a coordination bottleneck. A change to a shared protobuf definition would require PRs across multiple repos, and version mismatches cause runtime failures. Coordinated releases become error-prone.

The team evaluated Nx, Bazel, Turborepo, and a custom solution. Bazel offers the most power but has a steep learning curve. Nx is Node-centric. Turborepo provides the best balance of simplicity, caching, and language-agnostic task orchestration.

## Decision
All services, libraries, and infrastructure code live in a single monorepo managed by Turborepo.

- Repository structure: `apps/` for deployable services, `packages/` for shared libraries, `infra/` for Terraform and Kubernetes manifests.
- Turborepo manages task dependencies and caching across the entire repo.
- Language-specific tooling (cargo for Rust, poetry for Python, pnpm for TypeScript) operates within its workspace but is orchestrated by Turborepo pipeline definitions.
- Shared types are defined once in `packages/shared-types` and consumed by all TypeScript services.
- Protobuf definitions live in `packages/proto` and generate typed clients for all three languages.
- CI/CD uses Turborepo's `--filter` to build and test only affected packages on each PR.

## Consequences

**Positive:**
- Atomic changes across services — a schema change and all its consumers update in one PR.
- Shared types eliminate version drift between services.
- Turborepo remote caching (via Vercel) dramatically reduces CI build times — unchanged packages are not rebuilt.
- Single CI/CD pipeline simplifies DevOps.
- Code review is centralized; cross-cutting concerns are visible in a single diff.
- Dependency updates (security patches) apply once and propagate everywhere.

**Negative:**
- Repository size grows over time. Git operations (clone, status) may slow down. Mitigated with shallow clones and sparse checkout in CI.
- Turborepo's caching requires careful cache key configuration — incorrect keys lead to stale builds.
- All developers need the full toolchain (Node.js, Python, Rust) for a complete local build, though most work only touches one language.
- Access control is coarser — all developers can see all code. Acceptable for the current team size.
- Build configuration complexity lives in `turbo.json` pipeline definitions which require understanding of the dependency graph.
