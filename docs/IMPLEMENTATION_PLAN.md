# Capacity Connect — Implementation Plan

## Product decision

Build the smallest architecturally correct version of the complete product around one transformation, not a generic LMS: **a role requirement exposes a validated competency gap, the system recommends an intervention, the learner produces evidence, a trainer verifies it, and the organisation sees capability movement**.

## Delivery matrix

| Feature | Current state | Target state | Dependencies | Phase | Acceptance criteria | Test requirements | Security / database impact | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Capability readiness | Pure deterministic calculation used by demo | Tenant-scoped domain service | Competency records, role requirements | 1 | Formula is explainable and capped | Unit + property tests | No client trust for persisted values | [x] COMPLETED |
| Skill-gap prioritisation | Gap and criticality shown in UI | Weighted gap engine with freshness and demand | User competencies, requirements, evidence freshness | 2 | Every gap has level, target, reason, and intervention | Unit + integration | Tenant and ownership checks | [~] IN PROGRESS |
| Learning recommendation | Three synthetic courses with reasons | Course-to-competency mapping and prerequisites | Course catalogue, enrollments, effectiveness | 2 | Recommendations list factors and avoid black-box language | Unit + query tests | Protected learner reads | [~] IN PROGRESS |
| Evidence verification | Demonstration state transition | Persisted submission/review state machine | Evidence, reviews, audit logs | 3 | Self-declared and verified are distinct; reviewer required | Integration + E2E | Transactional audit trail | [~] IN PROGRESS |
| Trainer matching | Explainable weighted match inputs | Availability-aware trainer matching | Verified expertise, time windows, delivery history | 3 | Every score includes factor breakdown | Unit + integration | Protect trainer/private evidence | [~] IN PROGRESS |
| Capability command centre | Synthetic department heatmap and risk signals | DB-derived tenant analytics | Departments, competencies, users, trainers | 4 | Click-through from KPI to affected records and action | Query + E2E | Aggregate only authorised tenant data | [~] IN PROGRESS |
| Auth/RBAC/tenancy | Scaffold available; product claims demo boundary | Trainee, trainer, admin server-side roles | Manus OAuth, role/tenant claims | 1 | Forbidden operations fail server-side | Auth integration | Core security boundary | [ ] NOT STARTED |
| Notifications/campaigns | UI entry points | In-app notifications and measurable campaigns | Notification adapter, campaign tables | 5 | Before/after KPI captured | Integration | Audit and tenant scope | [ ] NOT STARTED |

## SIH demo acceptance journey

1. Open the command centre and explain the 54% readiness calculation.
2. Select the Radar Interpretation gap and show current level 1 vs target 3.
3. Start the 96% matched learning path.
4. Open Evidence Review and verify the practical task.
5. Return to the passport and show the level moving to Working with trainer-verified evidence.
6. Open Capability Map and connect the individual signal to the Forecasting department risk and campaign action.

## Design direction

The interface uses a calm navy workspace shell, indigo action color, generous whitespace, compact data density, and understated status colors. It is intentionally minimal but not empty: the visual hierarchy puts the next decision above secondary navigation. Mobile behavior collapses the sidebar and preserves the action flow.
