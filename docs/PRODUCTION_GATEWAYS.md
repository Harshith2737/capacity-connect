# Production Gateway Strategy

## Decision

Capacity Connect remains a **modular monolith** for the core product, with provider-neutral gateways and a versioned assessment boundary. This keeps identity, tenancy, competency, evidence, audit, and analytics transactionally consistent while allowing heavy or separately scaled concerns to move behind a service contract later.

## Real data policy

The platform must use tenant-scoped database records for operational metrics. Synthetic demo records may remain in a deterministic seed, but every demo surface must label them as `DEMO / SYNTHETIC DATA`. External IMD datasets must not be introduced until an authoritative source, schema, licence, update cadence, and provenance record are confirmed.

## Gateway boundaries

| Gateway | Core responsibility | Optional provider examples | Security requirements |
| --- | --- | --- | --- |
| AssessmentGateway | Start, submit, score, and return attempt state | In-process scorer first; separately hosted assessment service later | Server-side scoring, signed attempt tokens, time/attempt limits, replay protection |
| FileGateway | Upload URL, object ownership, malware scan hook | S3-compatible object storage or built-in storage | Tenant and owner checks, MIME/size allowlist, private objects |
| NotificationGateway | In-app/email/SMS/push delivery | Email provider, notification service | No secrets in logs, retry/idempotency, template allowlist |
| IntelligenceGateway | Explanations and content assistance only | Gemini or another configured provider | Human review, auditability, no autonomous verification or eligibility decisions |

## Assessment hosting

The assessment domain is already isolated behind `assessmentGateway` procedures and a provider-neutral `AssessmentGateway` interface. For the current deployment, it can run inside the modular monolith with one transaction boundary. If assessment traffic or anti-cheat requirements justify separate hosting, deploy a service implementing the same versioned contract at `ASSESSMENT_GATEWAY_URL`; the core application remains the source of truth for users, attempts, competency updates, and audit records.

A separate host is **not** automatically safer. It becomes appropriate when there is a demonstrated need for independent scaling, stricter network isolation, proctoring, browser telemetry, or a different runtime. Until those requirements are supplied, the in-process boundary avoids distributed consistency bugs.

## Connector status

The current session has no project-level connector entries in `manus-config`. The application therefore uses environment-driven adapters and does not claim access to Gmail, Supabase, or other external connectors. Adding a connector requires an explicit provider, account, data contract, and credential/permission scope; secrets must be provisioned through the host and never committed.

## Production sequence

1. Apply the Drizzle migration in a non-production environment.
2. Provision a real organization, department, roles, competency framework, and approved users.
3. Configure private object storage and malware scanning.
4. Add the notification provider and an idempotent outbox worker.
5. Add assessment attempt scoring and E2E tests before publishing assessments.
6. Add tenant-isolation and role-permission tests.
7. Only then connect authoritative IMD data sources, with provenance metadata and a refresh job.
