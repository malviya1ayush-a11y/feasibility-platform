-- Feasibility Platform — core schema (v0.1, Day 1)
-- Source of truth for the Supabase/Postgres database.
-- Multi-tenant: every customer-owned row carries org_id; RLS policies filter on it.

create extension if not exists "uuid-ossp";

-- ───────────────────────── Tenancy ─────────────────────────

create table orgs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  kind        text not null check (kind in ('builder', 'pmc')),
  created_at  timestamptz not null default now()
);

-- Mirrors Supabase auth.users; app-level profile + org membership
create table members (
  id          uuid primary key,              -- = auth.users.id
  org_id      uuid not null references orgs(id),
  full_name   text,
  role        text not null default 'owner' check (role in ('owner', 'member')),
  created_at  timestamptz not null default now()
);

-- ───────────────────────── Properties ─────────────────────────

create table properties (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references orgs(id),
  name          text not null,                -- e.g. "Shree Ganesh CHS, Mulund W"
  jurisdiction  text not null default 'mh-udcpr'
                check (jurisdiction in ('mh-udcpr', 'mum-dcpr2034')),
  address       text,
  ward_zone     text,                         -- municipal ward / zone label
  created_by    uuid references members(id),
  created_at    timestamptz not null default now()
);

-- Each material input is a row, so every value carries its own data-status tag.
create table property_inputs (
  id           uuid primary key default uuid_generate_v4(),
  property_id  uuid not null references properties(id) on delete cascade,
  org_id       uuid not null references orgs(id),
  key          text not null,                 -- e.g. 'plot_area_sqm', 'road_width_m',
                                              -- 'existing_bua_sqm', 'num_existing_members',
                                              -- 'land_rate_ready_reckoner', 'zone_type'
  value        jsonb not null,                -- number | string | object
  status       text not null default 'assumed' check (status in
               ('verified','extracted','assumed','estimated','requires_professional_verification')),
  source_note  text,                          -- where the value came from
  updated_at   timestamptz not null default now(),
  unique (property_id, key)
);

-- ───────────────────────── Rules engine ─────────────────────────

-- Published ruleset versions (the JSON also lives in the repo; this registers it).
create table rulesets (
  id           text primary key,              -- e.g. 'mh-udcpr-0.1'
  jurisdiction text not null,
  version      text not null,
  status       text not null default 'draft' check (status in ('draft','published','superseded')),
  notes        text,
  published_at timestamptz
);

-- ───────────────────────── Feasibility runs & reports ─────────────────────────

-- One run = one deterministic computation over a snapshot of inputs.
create table feasibility_runs (
  id           uuid primary key default uuid_generate_v4(),
  property_id  uuid not null references properties(id) on delete cascade,
  org_id       uuid not null references orgs(id),
  ruleset_id   text not null references rulesets(id),
  inputs       jsonb not null,                -- frozen snapshot of property_inputs at run time
  assumptions  jsonb not null,                -- user-editable assumptions (costs, rates, premiums)
  results      jsonb not null,                -- {conservative, base, optimised} scenario outputs
  trace        jsonb not null,                -- per-number trace: rule ids + inputs used
  created_by   uuid references members(id),
  created_at   timestamptz not null default now()
);

-- Immutable, versioned reports generated from a run.
create table reports (
  id           uuid primary key default uuid_generate_v4(),
  run_id       uuid not null references feasibility_runs(id),
  property_id  uuid not null references properties(id),
  org_id       uuid not null references orgs(id),
  version      int not null,                  -- 1, 2, 3… per property
  title        text not null,
  pdf_path     text,                          -- Supabase Storage path once exported
  created_at   timestamptz not null default now(),
  unique (property_id, version)
);

-- ───────────────────────── RLS (enable + org isolation) ─────────────────────────

alter table orgs              enable row level security;
alter table members           enable row level security;
alter table properties        enable row level security;
alter table property_inputs   enable row level security;
alter table feasibility_runs  enable row level security;
alter table reports           enable row level security;

create or replace function current_org_id() returns uuid
language sql stable as $$
  select org_id from members where id = auth.uid()
$$;

create policy org_isolation_properties on properties
  using (org_id = current_org_id());
create policy org_isolation_inputs on property_inputs
  using (org_id = current_org_id());
create policy org_isolation_runs on feasibility_runs
  using (org_id = current_org_id());
create policy org_isolation_reports on reports
  using (org_id = current_org_id());
create policy members_self on members
  using (org_id = current_org_id());
create policy orgs_self on orgs
  using (id = current_org_id());

-- rulesets are global read-only reference data
alter table rulesets enable row level security;
create policy rulesets_read on rulesets for select using (true);
