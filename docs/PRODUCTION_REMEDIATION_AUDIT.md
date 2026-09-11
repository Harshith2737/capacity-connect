# CAPACITY CONNECT — Production Remediation Audit

> Scope: repository `Harshith2737/capacity-connect` at `main` (September 11, 2026), cross-checked against the current SIH PS 26075 requirements and the project's own master engineering specification.
>
> This audit intentionally does not treat the published Manus URL as a reliable source of truth because the browser environment cannot retrieve that host directly. The GitHub repository is therefore the authoritative implementation source for this audit. A screen recording/screenshots of the deployed site can be attached later to add visual/browser-runtime findings.

## Executive finding

The repository has a useful technical foundation, but it is **not yet a complete CAPACITY CONNECT implementation**.

The current codebase is primarily a single React/Vite workspace screen with a functional tRPC/database/security slice behind it. The latest commits describe production-oriented increments and successful local checks, but the product surface remains substantially narrower than the SIH requirements.

The most important defect is architectural/product-level: the application is presented as a multi-role capacity platform, while the router currently exposes only `/` and `/404`. The role switcher in `Home.tsx` is local React state, not an authenticated/authorized portal boundary. This makes the published product appear broken as soon as a user follows a route or expects persistent role-specific navigation.

## Confirmed issues

### P0 — Application routing is effectively incomplete

`client/src/App.tsx` currently routes only:

- `/` → `Home`
- `/404` → `NotFound`
- everything else → `NotFound`

Therefore the expected trainee/trainer/admin portal routes do not exist.

### P0 — The product is a single-screen workspace, not three real portals

`Home.tsx` contains `role` and `view` in local state. Switching role changes UI state but does not change the authenticated authorization context. This must be replaced by actual protected route groups and server-derived membership/role.

### P0 — Required SIH domains are missing from the actual application surface

The current repository does not expose complete production workflows for:

- trainee profile CRUD
- trainer profile CRUD
- role/permission administration
- course creation/edit/publish
- resource library CRUD
- enrollment workflow
- persistent learning progress
- question bank management
- assessment management UI
- evidence assignment/verification policy
- trainer availability CRUD
- explainable trainer-match request/result workflow
- certificates issuance/verification workflow
- announcements CRUD/publishing
- achievements CRUD/publishing
- notification center persistence/management
- organization-level analytics from transactional data
- role-to-competency administration
- campaign administration
- proper event/attendance operations

### P0 — Demo-only state remains inside production UI

`Home.tsx` contains client-side arrays for competencies, courses and trainers. The UI also mutates competency state locally after actions. The server has real evidence and assessment procedures, but the main command-center experience is still partially driven by browser state.

This violates the required invariant that major visible product state must survive refresh/logout and come from persisted domain records.

### P0 — Database technology is inconsistent with the target architecture

`drizzle/schema.ts` uses `drizzle-orm/mysql-core` and `server/db.ts` uses `drizzle-orm/mysql2`.

The product specification previously selected PostgreSQL as the production relational database. This needs an explicit decision:

- keep MySQL and update the architecture/docs accordingly, OR
- migrate the implementation to PostgreSQL.

Because the target is a government/enterprise relational system with strong transactional/audit requirements, PostgreSQL should remain the recommended production target unless an existing hosting constraint proves otherwise.

### P0 — Authentication is coupled to Manus OAuth scaffolding

`client/src/const.ts` and `useAuth.ts` are built around a Manus OAuth login flow. This is suitable for the current Manus runtime but is not yet a complete product authentication model with first-class application identities, approval, password reset/email verification, role provisioning and deploy-anywhere behavior.

The implementation must establish one clear identity model and make the runtime-independent authorization contract explicit.

### P0 — Server returns `undefined` when the database is unavailable in `getDb()` / `upsertUser()` paths

Several reads degrade to empty/undefined values when no database is configured. For production, health/readiness and request behavior must clearly distinguish:

- unauthenticated
- unprovisioned
- empty tenant
- unavailable dependency

A database outage must not look like a legitimate empty product state.

### P0 — Evidence review authorization is too broad

`evidenceGateway.listForReview` returns all submitted evidence for the organization to both trainers and admins. There is no visible trainer assignment/competency ownership/permission check restricting a trainer to evidence they are authorized to review.

Likewise, assessment review queue access is organization-wide for any trainer.

This needs object-level authorization.

### P1 — `workspace.summary` is not an organization analytics backend

The summary query loads capped collections and only the current user's competency records. It is useful for an MVP workspace but is not sufficient for the organization command center required by the product vision.

Organization analytics must be computed from aggregate queries over transactional records and must not depend on arbitrary `.limit(100)` collections.

### P1 — Assessment concurrency and correctness need hardening

The current attempt-limit check performs a read followed by insert without a transaction/locking strategy. Concurrent requests could create extra attempts.

Deadline enforcement is also not fully modeled as a persisted assessment deadline rule at the current schema/API surface.

### P1 — Competency update semantics are too simplistic

Evidence verification directly raises `validatedLevel` using `Math.max(...)`. This does not yet implement the full evidence aggregation model or competency freshness/revalidation rules.

The final design should maintain evidence history and derive competency state through a deterministic domain service.

### P1 — `intelligenceGateway` is explanation-only

The existing intelligence gateway can call the configured LLM to explain a recommendation, but the actual trainer matching/recommendation engines are not exposed as complete domain APIs.

The core deterministic recommendation and trainer-match engines must exist independently of an LLM.

### P1 — File scanning/storage flow is a good foundation but incomplete product workflow

Private storage, hash calculation, scan status and signed downloads are present. The remaining work is connecting this securely to course resources, trainer library content, certificates, and evidence lifecycle with object-level authorization.

### P1 — Dashboard layout contains placeholder navigation

`DashboardLayout.tsx` still contains placeholder entries such as `Page 1` and `Page 2` with `/some-path`. This is visibly broken production UX and must be removed/replaced.

### P1 — CI/CD is not evident in the repository tree

The repository root does not show a `.github/workflows` implementation in the inspected tree. Add CI for lint, typecheck, tests and production build, plus deployment checks appropriate to the chosen hosting model.

## Required remediation architecture

### Frontend

Keep the existing Vite/React stack unless the audit discovers a concrete reason to migrate. Introduce real route groups:

- `/trainee/*`
- `/trainer/*`
- `/admin/*`

Use shared layout/components but separate feature modules and authorization-aware navigation.

### Backend

Keep the existing Express + tRPC stack for the immediate completion pass. Refactor by domain rather than replacing the transport layer.

Required backend domains:

- auth
- identity
- organizations
- memberships
- roles/permissions
- trainee profiles
- trainer profiles
- competencies/frameworks
- courses/resources
- enrollments/progress
- assessments/questions/attempts/reviews
- evidence/reviews
- trainer verification
- trainer availability/matching
- certificates
- notifications/announcements/achievements
- events/attendance
- campaigns
- analytics
- audit

### Data

Resolve the MySQL/PostgreSQL architecture decision before building more schema around it. The schema should remain tenant-scoped and normalize relationships.

## Completion sequence

### Stage 1 — Stabilize routing and identity

1. Replace single-screen route model.
2. Create real portal routes.
3. Derive role from trusted membership.
4. Remove placeholder navigation.
5. Add unprovisioned-user and unauthorized states.

### Stage 2 — Eliminate demo-state leakage

1. Remove hardcoded course/competency/trainer arrays from business paths.
2. Introduce database-backed queries for the main command center.
3. Persist enrollments/progress.
4. Persist competency changes through domain services.
5. Revalidate queries after mutations.

### Stage 3 — Finish required trainee workflows

Profile → competencies → gaps → recommendations → course → enrollment → progress → assessment → evidence → certificates → feedback → notifications.

### Stage 4 — Finish required trainer workflows

Profile → verification → expertise → availability → courses → library → assessments → learners → evidence review → requests → analytics.

### Stage 5 — Finish required admin workflows

Users → approvals → roles → competency frameworks → role mapping → courses/content → assessments → trainer verification → announcements → achievements → analytics → audit.

### Stage 6 — Intelligence layer

Implement deterministic:

- readiness
- skill gap priority
- learning recommendation
- trainer matching
- capability heatmap
- capability risk

AI remains an optional explanation/assistance layer.

### Stage 7 — Security hardening

Add object-level authorization, tighter trainer review scopes, rate limits, CSRF strategy where needed, secure cookies, upload policy, audit coverage and dependency/security review.

### Stage 8 — Validation

Run:

- lint
- typecheck
- unit tests
- integration tests
- authorization tests
- E2E tests
- production build
- database migration/seed verification
- accessibility review
- responsive review

## Requirement traceability target

Every SIH requirement must map to:

`Requirement → UI route → API procedure → DB entity → Authorization rule → Test → Status`

Do not mark a requirement complete because only the UI exists.

## Release gates

### Demo-ready

- all three portals navigable
- deterministic seeded data
- complete trainee→trainer→admin story
- no broken links
- no placeholder navigation
- primary workflows survive refresh

### Production-candidate

- real database persistence
- object-level authorization
- CI passes
- E2E passes
- security review completed
- accessibility reviewed
- deployment documented

## Immediate code changes recommended

P0 now:

1. Real route map.
2. Real portal shells.
3. Remove placeholder navigation.
4. Replace local role switching with server membership/role.
5. Add database-backed trainee/trainer/admin dashboards.
6. Add course/enrollment/progress workflows.
7. Add trainer verification and matching APIs/UI.
8. Add admin management workflows.
9. Add organization analytics queries.
10. Resolve DB architecture decision.
11. Tighten evidence/assessment object-level authorization.
12. Add CI.

This document is intentionally blunt: the current repository has a strong foundation, but it should not be described as complete until the above product and security gaps are closed.