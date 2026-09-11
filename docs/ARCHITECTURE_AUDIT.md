# Capacity Connect — Architecture Audit

## Audit summary

The project was initialized as a WebDev `web-db-user` application: React + TypeScript + Tailwind on the client, Express + tRPC on the server, Drizzle for relational persistence, and Manus OAuth scaffolding. The repository began as a template with authentication plumbing and no product domain implementation.

## Current state

The delivered slice is a functional front-end command centre with an explicit synthetic-demo boundary. It models the core SIH journey in one workspace: competency baseline, skill-gap prioritisation, explainable learning recommendation, progress/evidence state, trainer capacity, and an organisation-level capability map. The UI uses React state for scenario transitions so judges can see the loop without fabricated backend claims. The banner labels the dataset as synthetic and every action describes what is demo-only or coming next.

The existing server and database scaffolding remains available for the next increment. No new production persistence was claimed in this slice; that is intentional and avoids presenting browser state as a secure database.

## Dependency and application map

| Area | Current implementation | Next production increment |
| --- | --- | --- |
| Identity | Manus OAuth scaffold and `useAuth` hook | Add role and tenant claims to server context |
| Client routing | Wouter root route with in-page workspace views | Add route-level trainee, trainer, and admin shells |
| Domain logic | Pure readiness, gap, and trainer-match functions in `shared/capacity.ts` | Move domain services behind protected tRPC procedures |
| Persistence | Drizzle/MySQL template schema | Add organizations, departments, competency framework, courses, evidence, reviews, and audit tables |
| Evidence | Explicit state machine in the UI demo | Persist submissions and trainer review transitions with audit events |
| Analytics | Deterministic synthetic capability map | Derive metrics from tenant-scoped records and materialized query helpers |
| AI | Not required for the core slice | Add an optional provider adapter for explanations and content classification only |

## Security findings and boundaries

No secrets are embedded in the client. The current demo does not claim to perform authentication, authorization, or cross-tenant data access; those concerns remain owned by the scaffold's server-side auth path. Before production release, every sensitive procedure must resolve tenant and role from trusted server context, validate inputs server-side, and audit evidence transitions.

## Reusable components

The scaffold's `DashboardLayout`, UI primitives, tRPC client, OAuth context, storage helpers, and database helpers are reusable. The new dashboard styles are intentionally product-specific rather than generic template styling.

## Migration strategy

1. Keep the current capability engine pure and testable.
2. Introduce normalized tenant-scoped tables and seed the same scenario records.
3. Add protected tRPC read procedures for the command centre and trainee passport.
4. Add mutations for enrollment, evidence submission, and trainer verification with transactions and audit rows.
5. Replace demo state with query invalidation while retaining loading, empty, error, and permission-denied states.
6. Add browser E2E coverage for the full SIH demonstration journey.
