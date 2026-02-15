# ADR 0004: Event-Driven Architecture with Redis Streams
Date: 2026-02-15 | Status: Accepted

## Context
CrestDesk's services need to communicate asynchronously for several cross-cutting concerns:

- **Audit logging**: Every significant action (document signed, listing updated, lead assigned) must be recorded for compliance.
- **Notifications**: Agents, buyers, and sellers receive email, SMS, and in-app notifications triggered by events across multiple services.
- **Compliance checks**: Content (emails, SMS, marketing materials) must be validated against federal and state regulations before delivery.
- **Analytics**: User behavior and transaction events feed into analytics pipelines.

Synchronous HTTP calls between services create tight coupling and cascading failures. If the notification service is down, the transaction service should not fail.

Options evaluated:
1. **RabbitMQ** — mature, feature-rich, but adds operational complexity (Erlang runtime, clustering).
2. **Apache Kafka** — best for high-throughput event streaming, but over-engineered for current scale. Operational burden of ZooKeeper/KRaft.
3. **Redis Streams** — lightweight, built into our existing Redis infrastructure, supports consumer groups with at-least-once delivery. Appropriate for current scale with a migration path to Kafka if needed.

## Decision
Use Redis Streams as the event backbone for asynchronous inter-service communication with at-least-once delivery guarantees.

- Events are published to named streams (e.g., `events:transactions`, `events:compliance`, `events:notifications`).
- Consumer groups enable multiple services to independently consume the same stream.
- Each consumer acknowledges messages after successful processing (`XACK`).
- Unacknowledged messages are retried up to 3 times via periodic `XPENDING` / `XCLAIM` checks.
- After 3 failed attempts, messages are moved to a dead letter stream (`dlq:{stream_name}`) for manual investigation.
- Streams are trimmed to a 7-day retention period using `XTRIM` with `MINID`.
- Event schema follows CloudEvents specification with a `type`, `source`, `subject`, and JSON `data` payload.

## Consequences

**Positive:**
- Leverages existing Redis infrastructure — no new system to deploy and operate.
- Consumer groups provide independent consumption with automatic load balancing.
- At-least-once delivery ensures no events are silently lost.
- Dead letter queue captures poison messages for debugging without blocking the stream.
- 7-day retention allows replaying recent events for recovery or debugging.
- CloudEvents schema provides a standardized envelope across all services.

**Negative:**
- Consumers must be idempotent — the same event may be delivered more than once. Every handler must use idempotency keys (event ID + consumer) to avoid duplicate processing.
- Redis Streams lack the durability guarantees of Kafka. Data lives in memory (with AOF persistence). A catastrophic Redis failure could lose recent events. Mitigated by Redis Sentinel for high availability.
- 7-day retention means historical events beyond that window are lost from the stream. Long-term event storage is handled separately by the audit service writing to PostgreSQL.
- No built-in schema registry. Event schema evolution must be managed by convention and versioning in the event `type` field.
- If event volume grows significantly (>100K events/sec), migration to Kafka will be necessary. The CloudEvents schema and consumer group patterns are designed to make this migration straightforward.
