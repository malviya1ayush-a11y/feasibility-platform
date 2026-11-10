# Feasibility Platform — Maharashtra

Development Feasibility Engine for builders and PMCs (Project Management Consultants) in Maharashtra. First pillar of the Real Estate Development Intelligence Platform. Web SaaS: create a property → enter plot details → deterministic feasibility → conservative/base/optimised scenarios → versioned report.

The master plan lives in the Claude Project doc `build-plan.md` (12-day schedule). Read it at the start of every session.

## Non-negotiable architecture rules

1. **The rules engine owns every calculation.** All regulatory and numerical computation happens in `src/rules-engine/` — deterministic, versioned, pure TypeScript with JSON rule files. AI never calculates; it only extracts and explains. Never put FSI/area/financial math in a React component or API route — always call the engine.
2. **Everything is traceable.** Every output number must be reproducible from: inputs + assumptions + ruleset version. Reports store the ruleset version they were computed with and are immutable once generated (new inputs ⇒ new report version).
3. **Data status tags everywhere.** Every material input carries one of: `verified` | `extracted` | `assumed` | `estimated` | `requires_professional_verification`. Regulatory values in rule files ship as `requires_professional_verification` until an architect/authority confirms them — never silently upgrade a tag.
4. **Jurisdiction-specific.** Maharashtra UDCPR + Mumbai DCPR 2034 only. Rule files are per-jurisdiction under `src/rules-engine/rulesets/`. No pan-India generalisation.
5. **Multi-tenant.** Every row that belongs to a customer carries `org_id`; all queries filter by it (Supabase RLS enforces this).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase: Postgres + Auth + Storage. Schema in `db/schema.sql` (source of truth; apply via Supabase SQL editor or migrations)
- Rules engine: pure TS, no external services, fully unit-testable
- Deploy: Vercel

## Conventions

- Rulesets are JSON files named `<jurisdiction>-<version>.json` (e.g. `mh-udcpr-0.1.json`); never mutate a published ruleset — bump the version.
- Money in INR, areas in sq m internally (convert to sq ft only at display).
- Every session ends with a commit; commit messages state the Day N module built.
