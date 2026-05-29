alter table public.profiles
  add column if not exists beta_access_until timestamptz;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  credit_amount integer not null default 0,
  free_beta_access boolean not null default false,
  active boolean not null default true,
  expires_at timestamptz,
  max_redemptions integer,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_credit_amount_check check (credit_amount >= 0),
  constraint promo_codes_max_redemptions_check check (max_redemptions is null or max_redemptions > 0)
);

create table if not exists public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  credits_granted integer not null default 0,
  redeemed_at timestamptz not null default now(),
  unique (promo_code_id, user_id)
);

alter table public.promo_codes enable row level security;
alter table public.promo_code_redemptions enable row level security;

create policy "promo code redemptions readable by owner"
  on public.promo_code_redemptions for select
  using (auth.uid() = user_id);

create or replace function public.redeem_promo_code(
  p_user_id uuid,
  p_code text
)
returns table(status text, credits_granted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.promo_codes%rowtype;
  v_redemption_count integer;
  v_normalized_code text;
begin
  v_normalized_code := upper(trim(p_code));

  if v_normalized_code = '' then
    return query select 'invalid'::text, 0::integer;
    return;
  end if;

  select *
  into v_code
  from public.promo_codes
  where code = v_normalized_code
  for update;

  if not found then
    return query select 'not_found'::text, 0::integer;
    return;
  end if;

  if not v_code.active then
    return query select 'inactive'::text, 0::integer;
    return;
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    return query select 'expired'::text, 0::integer;
    return;
  end if;

  if exists (
    select 1
    from public.promo_code_redemptions
    where promo_code_id = v_code.id
      and user_id = p_user_id
  ) then
    return query select 'already_redeemed'::text, 0::integer;
    return;
  end if;

  if v_code.max_redemptions is not null then
    select count(*)
    into v_redemption_count
    from public.promo_code_redemptions
    where promo_code_id = v_code.id;

    if v_redemption_count >= v_code.max_redemptions then
      return query select 'limit_reached'::text, 0::integer;
      return;
    end if;
  end if;

  insert into public.profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  insert into public.promo_code_redemptions (
    promo_code_id,
    user_id,
    credits_granted
  )
  values (
    v_code.id,
    p_user_id,
    v_code.credit_amount
  );

  if v_code.credit_amount > 0 then
    insert into public.credit_ledger (
      user_id,
      delta,
      reason
    )
    values (
      p_user_id,
      v_code.credit_amount,
      'promo_code_' || v_code.code
    );
  end if;

  update public.profiles
  set
    credits = credits + v_code.credit_amount,
    beta_access_until = case
      when v_code.free_beta_access then greatest(coalesce(beta_access_until, now()), coalesce(v_code.expires_at, now() + interval '180 days'))
      else beta_access_until
    end,
    updated_at = now()
  where id = p_user_id;

  return query select 'redeemed'::text, v_code.credit_amount;
exception
  when unique_violation then
    return query select 'already_redeemed'::text, 0::integer;
end;
$$;
