# Capacity Connect — Expanded Implementation Plan

## Product decision

Build the smallest architecturally correct version of the complete product around one transformation: **a role requirement exposes a validated competency gap, the system recommends an intervention, the learner produces evidence, a trainer verifies it, and the organisation sees capability movement**.

## Current delivery matrix

| Feature | Current state | Target state | Dependencies | Acceptance criteria | Status |
| --- | --- | --- | --- | --- | --- |
| Tenant model | Organizations, departments, memberships, roles, and tenant columns migrated | Admin-managed tenant onboarding and invitations | OAuth identity, approval workflows | Cross-tenant query tests pass | [~] IN PROGRESS |
| Competency model | Configurable competencies, role requirements, and user levels in schema | Admin UI for frameworks and role mapping | Tenant data and audit | No role requirement is hard-coded | [~] IN PROGRESS |
| Readiness and gaps | Pure deterministic calculations in shared code and demo | Server query derived from transactional records | Competency records and freshness | Formula and factors are explainable | [x] COMPLETED |
| Learning | Demo recommendation experience and course/enrollment schema | Persisted course catalogue, modules, progress, and effectiveness | Object storage, content workflows | Enrollment and progress are transactional | [~] IN PROGRESS |
| Assessment gateway | Versioned tRPC boundary, attempt limits, server-side answer-hash scoring, multiple modalities in schema | Complete authoring, attempt UI, practical/rubric reviewer workflow, optional isolated service | Questions, attempts, audit, anti-replay controls | Browser never supplies score | [~] IN PROGRESS |
| Evidence verification | Tenant-scoped review mutation, audit row, validated-level update | Storage upload signing, malware scan hook, reviewer queues, revalidation | File gateway, trainer memberships | Verified is human-reviewed and auditable | [~] IN PROGRESS |
| Trainer matching | Explainable weighted engine in shared code and UI | Verified expertise and real availability data | Trainer verification, availability, delivery evidence | Every match includes factor breakdown | [~] IN PROGRESS |
| AI gateway | Optional recommendation explanation using configured server-side capability | Content classification, extraction, admin summaries with review | Provider adapter and audit | AI never performs verification or eligibility decisions | [~] IN PROGRESS |
| Observability | `/health`, `/ready`, gateway capability status | Request IDs, structured logs, error tracking | Deployment environment | Readiness fails safely when DB unavailable | [~] IN PROGRESS |
| Governance | Audit table and evidence review audit writes | Full audit coverage for approvals, roles, publication, certificates | Auth/RBAC and admin workflows | No secrets or passwords in audit logs | [~] IN PROGRESS |

## Immediate next production increments

1. Add admin onboarding screens for organization, departments, roles, competencies, and users.
2. Build storage-backed evidence upload with MIME/size/ownership checks and malware-scan adapter.
3. Complete assessment attempt UI and add integration tests for start, submit, scoring, expiry, and attempt limits.
4. Add trainer availability and verification data, then compute matching from real records.
5. Add notification outbox and retry worker for approvals, evidence reviews, deadlines, and certificates.
6. Connect authoritative IMD sources only after provenance, licensing, refresh, and schema requirements are confirmed.
