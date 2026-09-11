# Capacity Connect Architecture Decisions

## ADR-001 — Modular monolith with versioned gateways

Keep identity, tenant membership, competency, evidence, audit, and analytics in one deployable modular monolith. Use gateway interfaces for storage, notification, intelligence, and assessments. Split a gateway into a separate service only when independent scale, network isolation, proctoring, or runtime needs are demonstrated.

## ADR-002 — Tenant isolation from trusted context

The browser never supplies the authoritative organization ID. Protected procedures resolve active membership from the authenticated user and scope every query and write to that organization. The current schema stores organization ownership on all sensitive domain tables.

## ADR-003 — Assessment integrity

Assessment attempts are created server-side, limited by assessment policy, tied to the authenticated user and tenant, and scored from server-held answer hashes. Practical and rubric assessments are never auto-upgraded into verified competency without human review.

## ADR-004 — Evidence is an auditable state machine

Evidence moves through submitted, under review, verified, rejected, or expired. Every review creates an evidence review row and an audit event. A verified evidence record can raise a validated competency level only through the review service.

## ADR-005 — AI is optional and non-authoritative

The configured built-in server LLM capability may explain recommendations or classify content. It cannot approve users, verify evidence, change roles, or make eligibility decisions. Deterministic competency and matching rules remain authoritative and usable without AI.

## ADR-006 — Synthetic data provenance

Synthetic demo records are allowed for SIH demonstration only and are labeled. Official IMD data requires a confirmed authoritative source, provenance metadata, refresh cadence, licensing/usage approval, and a tenant-safe ingestion workflow.

## ADR-007 — Production readiness endpoints

`/health` reports process liveness. `/ready` reports database availability and configured gateway capability flags so deployment can fail safely when the database is unavailable.
