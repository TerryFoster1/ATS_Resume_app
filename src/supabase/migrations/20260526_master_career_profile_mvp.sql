-- Master Career Profile MVP additive migration.
-- Apply before deploying profile persistence code to production.
--
-- This migration is intentionally additive:
-- - no existing profile_memory columns are changed
-- - no generated_outputs, credit, auth, Stripe, or dashboard tables are touched
-- - existing rows receive empty-array defaults for new JSONB fields
--
-- Rollback guidance:
-- Prefer app rollback only. These columns are additive and safe to leave in place.
-- If a database rollback is absolutely required, export any profile MVP data first,
-- then manually drop only the columns added below.

alter table public.profile_memory
  add column if not exists volunteer_experience jsonb not null default '[]'::jsonb,
  add column if not exists certifications jsonb not null default '[]'::jsonb,
  add column if not exists awards jsonb not null default '[]'::jsonb,
  add column if not exists projects jsonb not null default '[]'::jsonb,
  add column if not exists extracurriculars jsonb not null default '[]'::jsonb,
  add column if not exists achievements jsonb not null default '[]'::jsonb,
  add column if not exists interests jsonb not null default '[]'::jsonb,
  add column if not exists career_goals jsonb not null default '[]'::jsonb,
  add column if not exists resume_imports jsonb not null default '[]'::jsonb,
  add column if not exists discovery_notes jsonb not null default '[]'::jsonb,
  add column if not exists master_profile_version integer not null default 1;
