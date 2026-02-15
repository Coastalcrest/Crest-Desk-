# ADR 0009: Datadog for Full-Stack Observability
Date: 2026-02-15 | Status: Accepted

## Context
CrestDesk runs 16+ services across three languages (TypeScript, Python, Rust) deployed on Kubernetes. Observability — the ability to understand what the system is doing and why — is essential for:

- **Incident response**: When an agent reports that e-signatures are not working, the team must quickly identify whether the issue is in the API gateway, the esign service, the database, or the email delivery pipeline.
- **Performance optimization**: Identifying slow database queries, inefficient service-to-service calls, and resource bottlenecks before they affect users.
- **Business monitoring**: Tracking key metrics like transaction completion rates, email deliverability, and compliance check latency.
- **Compliance**: Maintaining audit logs and demonstrating system reliability to enterprise clients.

The three pillars of observability — metrics, traces, and logs — must be correlated across all services regardless of language. A request that flows from the React frontend through the API gateway to the compliance engine to the email service must be traceable end-to-end.

Options evaluated:
1. **Self-hosted (Prometheus + Grafana + Jaeger + ELK)** — full control, no per-host costs, but significant operational overhead. Requires dedicated DevOps time to maintain, scale, and upgrade. Alert management across four systems is fragmented.
2. **New Relic** — good APM, but pricing model (per-user + per-GB ingestion) becomes expensive at scale. Language support varies in quality.
3. **Datadog** — unified platform for APM, infrastructure, logs, and alerting. Excellent multi-language support. Higher cost but reduces operational burden and provides correlated observability.
4. **Grafana Cloud** — growing platform but APM capabilities are less mature than Datadog.

## Decision
Use Datadog as the unified observability platform for all CrestDesk services, covering APM (distributed tracing), infrastructure metrics, log aggregation, and alerting.

- **Datadog Agent** runs as a sidecar container on every Kubernetes pod, collecting metrics, traces, and logs.
- **APM**: Distributed tracing with automatic instrumentation for TypeScript (dd-trace-js), Python (ddtrace), and Rust (custom OpenTelemetry integration forwarded to Datadog).
- **Logs**: Structured JSON logs from all services are shipped to Datadog via the agent. Logs are correlated with traces using trace IDs.
- **Metrics**: Application metrics (request latency, error rates, queue depths) and infrastructure metrics (CPU, memory, disk, network) are collected and dashboarded.
- **Alerting**: Monitors configured for SLOs (99.9% uptime for transaction services), error rate thresholds, latency P99 targets, and business metrics (e.g., compliance check failure rate >1%).
- **Synthetics**: Synthetic tests simulate critical user journeys (login, create transaction, sign document) from multiple geographic locations.

## Consequences

**Positive:**
- Correlated metrics, traces, and logs in a single platform — clicking from an error log to the trace to the infrastructure metrics is seamless.
- Automatic instrumentation for TypeScript and Python means most services get tracing with minimal code changes.
- SLO-based alerting reduces alert fatigue — alerts fire based on error budgets rather than arbitrary thresholds.
- Synthetics catch issues before users do by continuously running critical workflows.
- Unified dashboards give the team a single pane of glass across all 16+ services.
- Datadog's APM supports the full request lifecycle: browser (Real User Monitoring) through backend services to database queries.

**Negative:**
- Cost scales with infrastructure: per-host pricing for infrastructure, per-GB for logs, per-span for APM. At 16+ services with multiple replicas, this is a significant monthly expense (~$2,000-5,000/month estimated).
- Vendor lock-in — dashboards, monitors, and integrations are Datadog-specific. Migration to another platform would require rebuilding all observability configuration.
- Rust integration is not as seamless as TypeScript/Python — requires OpenTelemetry SDK with a Datadog exporter, adding complexity to the Rust services.
- Log volume must be managed carefully — verbose logging across 16 services can cause cost spikes. Log sampling and exclusion filters are necessary.
- Datadog agent as a sidecar adds resource overhead (CPU, memory) to every pod. Approximately 128MB memory and 0.1 CPU per pod.
- Team must learn Datadog's query language (DQL) and monitor configuration, adding to the tooling learning curve.
