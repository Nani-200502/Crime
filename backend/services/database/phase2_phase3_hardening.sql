-- Phase 2 + 3 hardening: indexes and RLS policies for case-isolated access.
-- Run in Supabase SQL Editor in non-prod first, then promote to production.

begin;

-- Performance indexes for high-traffic filters.
create index if not exists cases_user_created_idx
  on public.cases (user_id, created_at desc);

create index if not exists sketches_case_created_idx
  on public.sketches (case_id, created_at desc);

create index if not exists refinements_case_created_idx
  on public.refinements (case_id, created_at desc);

-- Guard against duplicate sketch versions within a case timeline.
create unique index if not exists sketches_case_version_unique_idx
  on public.sketches (case_id, version);

-- Enable RLS for per-user isolation.
alter table public.users enable row level security;
alter table public.cases enable row level security;
alter table public.sketches enable row level security;
alter table public.refinements enable row level security;

-- Optional but recommended so owners are still bound by policy checks.
alter table public.users force row level security;
alter table public.cases force row level security;
alter table public.sketches force row level security;
alter table public.refinements force row level security;

-- Users table policies.
drop policy if exists users_select_own on public.users;
create policy users_select_own
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Cases table policies.
drop policy if exists cases_select_own on public.cases;
create policy cases_select_own
  on public.cases
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists cases_insert_own on public.cases;
create policy cases_insert_own
  on public.cases
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists cases_update_own on public.cases;
create policy cases_update_own
  on public.cases
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists cases_delete_own on public.cases;
create policy cases_delete_own
  on public.cases
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Sketches table policies, gated by parent case ownership.
drop policy if exists sketches_select_own_case on public.sketches;
create policy sketches_select_own_case
  on public.sketches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.case_id = sketches.case_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists sketches_insert_own_case on public.sketches;
create policy sketches_insert_own_case
  on public.sketches
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.cases c
      where c.case_id = sketches.case_id
        and c.user_id = auth.uid()
    )
  );

-- Refinements table policies, gated by parent case ownership.
drop policy if exists refinements_select_own_case on public.refinements;
create policy refinements_select_own_case
  on public.refinements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cases c
      where c.case_id = refinements.case_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists refinements_insert_own_case on public.refinements;
create policy refinements_insert_own_case
  on public.refinements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.cases c
      where c.case_id = refinements.case_id
        and c.user_id = auth.uid()
    )
  );

commit;
