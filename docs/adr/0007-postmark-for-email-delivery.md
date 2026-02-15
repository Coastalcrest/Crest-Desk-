# ADR 0007: Postmark for Email Delivery
Date: 2026-02-15 | Status: Accepted

## Context
Email is a mission-critical communication channel for real estate transactions. Missed or delayed emails directly impact closings:

- Contract notifications that land in spam can cause missed deadlines.
- Disclosure delivery failures create legal liability.
- E-signature request emails that bounce delay the entire transaction pipeline.
- Marketing emails (listing alerts, market reports) drive agent productivity and lead nurturing.

The platform requires 98%+ inbox placement rate for transactional emails. Deliverability is not a nice-to-have — it is a business requirement.

Options evaluated:
1. **Amazon SES** — lowest cost ($0.10/1K emails), but deliverability depends heavily on sender reputation management. Shared IP pools can be affected by other senders. Requires significant expertise to maintain high inbox rates.
2. **SendGrid** — popular, good API, but deliverability has degraded in recent years due to platform abuse. Transactional and marketing share reputation unless carefully separated.
3. **Postmark** — purpose-built for transactional email with industry-leading deliverability. Strict anti-spam policies mean shared IP reputation is protected. Higher cost but highest inbox rates.
4. **Mailgun** — decent deliverability, good API, but less focused on deliverability than Postmark.

## Decision
Use Postmark as the primary email delivery service for all platform email. Operate separate Postmark servers for transactional and marketing email to protect transactional reputation.

- **Transactional server**: contract notifications, e-signature requests, disclosure deliveries, password resets, system alerts. These emails must reach the inbox.
- **Marketing server**: listing alerts, market reports, drip campaigns, newsletters. These have higher complaint rates and must not affect transactional deliverability.
- Each brokerage gets a verified sender domain with DKIM, SPF, and DMARC configured.
- Postmark's message streams separate transactional and broadcast within each server.
- Bounce and complaint webhooks feed back into the platform to maintain list hygiene and update contact records.
- Delivery status is tracked per-message and exposed in the agent dashboard.

## Consequences

**Positive:**
- Industry-leading deliverability (99%+ inbox rate for transactional email) — Postmark's strict anti-spam policies protect shared IP reputation.
- Separate transactional and marketing servers ensure that marketing complaints never affect transactional delivery.
- Per-brokerage sender domains build domain reputation specific to each brokerage.
- Built-in bounce and complaint handling keeps contact lists clean automatically.
- Detailed delivery analytics help diagnose issues before they affect closings.
- Postmark's template system supports brokerage-branded email templates.

**Negative:**
- Higher cost than Amazon SES: approximately $1.25/1K emails vs. $0.10/1K. At projected volume (500K emails/month), this is ~$625/month vs. ~$50/month. The cost is justified by deliverability guarantees.
- Postmark's strict content policies may reject emails that other providers would send. Marketing content must comply with their acceptable use policy.
- Vendor dependency — switching email providers requires re-warming IP reputation and updating DNS records for all brokerage domains. Mitigated by abstracting the email provider behind an internal service interface.
- Postmark does not support dedicated IP addresses on lower-tier plans. At high volume, dedicated IPs may be needed for reputation isolation.
- Two separate Postmark servers (transactional + marketing) mean two sets of API keys, webhooks, and monitoring dashboards to manage.
