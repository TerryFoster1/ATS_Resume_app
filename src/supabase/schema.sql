create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  credits integer not null default 0,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generated_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_title text not null default 'Tailored application',
  company_name text,
  created_at timestamptz not null default now(),
  resume_text text not null,
  cover_letter_text text not null,
  source_job_description text not null,
  analysis_summary text,
  clarification_answers jsonb not null default '[]'::jsonb,
  analysis_snapshot jsonb,
  resume_unlocked boolean not null default false,
  cover_letter_unlocked boolean not null default false,
  interview_prep_status text not null default 'pending'
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null,
  reason text not null,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  pack text not null,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

alter table public.purchases
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists credit_ledger_stripe_checkout_session_id_key
  on public.credit_ledger(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function public.fulfill_credit_purchase(
  p_user_id uuid,
  p_pack text,
  p_checkout_session_id text,
  p_customer_id text default null,
  p_payment_intent_id text default null
)
returns table(status text, credits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits integer;
begin
  if p_pack = '5' then
    v_credits := 5;
  elsif p_pack = '10' then
    v_credits := 10;
  else
    raise exception 'Unsupported credit pack: %', p_pack;
  end if;

  if exists (
    select 1
    from public.credit_ledger
    where stripe_checkout_session_id = p_checkout_session_id
  ) then
    return query select 'duplicate'::text, 0::integer;
    return;
  end if;

  insert into public.credit_ledger (
    user_id,
    delta,
    reason,
    stripe_checkout_session_id
  )
  values (
    p_user_id,
    v_credits,
    'stripe_credit_pack_' || p_pack,
    p_checkout_session_id
  );

  update public.profiles
  set
    credits = credits + v_credits,
    stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found for user %', p_user_id;
  end if;

  insert into public.purchases (
    user_id,
    stripe_checkout_session_id,
    stripe_customer_id,
    stripe_payment_intent_id,
    pack,
    status
  )
  values (
    p_user_id,
    p_checkout_session_id,
    p_customer_id,
    p_payment_intent_id,
    p_pack,
    'completed'
  )
  on conflict (stripe_checkout_session_id)
  do update set
    user_id = excluded.user_id,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_payment_intent_id = excluded.stripe_payment_intent_id,
    pack = excluded.pack,
    status = 'completed';

  return query select 'fulfilled'::text, v_credits;
exception
  when unique_violation then
    return query select 'duplicate'::text, 0::integer;
end;
$$;

create table if not exists public.profile_memory (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  education jsonb not null default '[]'::jsonb,
  work_history jsonb not null default '[]'::jsonb,
  volunteer_experience jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  awards jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  extracurriculars jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  interests jsonb not null default '[]'::jsonb,
  career_goals jsonb not null default '[]'::jsonb,
  resume_imports jsonb not null default '[]'::jsonb,
  discovery_notes jsonb not null default '[]'::jsonb,
  master_profile_version integer not null default 1,
  star_examples jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  tools_platforms jsonb not null default '[]'::jsonb,
  writing_preferences jsonb not null default '{}'::jsonb,
  locale_preference text,
  interview_answers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.generated_outputs enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.purchases enable row level security;
alter table public.profile_memory enable row level security;

create policy "profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "generated outputs are readable by owner"
  on public.generated_outputs for select
  using (auth.uid() = user_id);

create policy "profile memory readable by owner"
  on public.profile_memory for select
  using (auth.uid() = user_id);
