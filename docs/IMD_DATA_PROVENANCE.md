# IMD Data Provenance

## Scope

Capacity Connect now includes an **official-source catalog loader** for organization units and competency themes. It does not claim to be a live IMD HR directory, and it does not import personal staff data, operational forecasts, or restricted systems.

## Sources

| Catalog content | Official source | Use in product |
| --- | --- | --- |
| Regional Meteorological Centres and specialist divisions | [IMD organisational structure](https://mausam.imd.gov.in/imd_latest/contents/organisational-structure.php) | Seed departments such as the six Regional Meteorological Centres, Satellite Meteorology, Hydrometeorology, Instrumentation, Training, and Seismology |
| Forecasting, observation, systems, climate, warning, sectoral-service, and research competency themes | [IMD training SOP](https://mausam.imd.gov.in/imd_latest/contents/pdf/training_sop.pdf) | Seed competency descriptions and provenance URLs |
| Forecaster training subjects and evaluation themes | [IMD Pune Forecaster Training Course](https://www.imdpune.gov.in/training/academics/forecaster.html) | Validate the competency taxonomy around Dynamic Meteorology & NWP, Physical Meteorology, Synoptic & Aviation Meteorology, Climate Science & Hydrometeorology, Satellite Meteorology, Radar Meteorology, practical examination, viva, and project evaluation |

## Loader behavior

The admin-only `workspace.seedOfficialImd` procedure is idempotent by organization and competency/department name. Every seeded department and competency stores its source label and source URL. Every catalog seed writes an audit event containing the source URLs and counts.

## Real-data boundary

The loader is realistic and provenance-backed, but it is not a live external integration. The current session has no IMD connector configured. A future live ingestion pipeline must add source authentication or public-feed handling, refresh cadence, change detection, validation, licensing review, and a quarantine path before replacing catalog data. Personal names, assignments, vacancies, performance, and operational records must never be inferred from public catalog pages.
