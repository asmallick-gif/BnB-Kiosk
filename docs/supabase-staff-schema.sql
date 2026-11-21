-- Bake'n Brew Kiosk + Staff Backend Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor (or as a Supabase CLI migration).
-- Security hardening:
--   * Parameterized SQL in every RPC/trigger (zero dynamic EXECUTE string concatenation)
--   * Locked search_path on all SECURITY DEFINER functions
--   * Explicit REVOKE ALL before minimal role-scoped GRANTs
--   * SHA-256 hashed staff invitation codes (raw codes are never persisted)
--   * Row Level Security (RLS) + server-side CHECK constraints on every table

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Staff invitations (hashed) & staff profiles
-- ---------------------------------------------------------------------------

create table if not exists public.staff_invitations (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  role text not null default 'staff' check (role in ('staff', 'manager', 'admin')),
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  uses_count integer not null default 0 check (uses_count >= 0 and uses_count <= max_uses),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (
    char_length(email) <= 254
    and email ~* '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'
  ),
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  first_name text not null default '' check (char_length(first_name) <= 40),
  last_name text not null default '' check (char_length(last_name) <= 40),
  middle_initial text not null default '' check (char_length(middle_initial) <= 2),
  home_address text not null default '' check (char_length(home_address) <= 200),
  avatar_url text not null default '' check (char_length(avatar_url) <= 2900000),
  role text not null default 'staff' check (role in ('staff', 'manager', 'admin')),
  active boolean not null default true,
  previous_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.hash_invitation_code(p_code text)
returns text
language sql
immutable
strict
set search_path = public, extensions
as $$
  select encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.staff_profiles
    where id = auth.uid()
      and active = true
  );
$$;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.staff_profiles
    where id = auth.uid()
      and active = true
      and role in ('admin', 'manager')
  );
$$;

-- Create an invitation from a specific code (callable from SQL Editor / service role or active admin).
create or replace function public.create_staff_invitation(
  p_code text,
  p_role text default 'staff',
  p_max_uses integer default 1,
  p_expires_hours integer default 168
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean text;
begin
  if auth.uid() is not null and not public.is_active_admin() then
    raise exception 'Unauthorized: manager or admin role required.';
  end if;

  v_clean := upper(trim(coalesce(p_code, '')));
  if v_clean !~ '^[A-Z0-9-]{6,32}$' then
    raise exception 'Invitation code must be 6-32 characters of A-Z, 0-9, and hyphens.';
  end if;

  if p_role not in ('staff', 'manager', 'admin') then
    raise exception 'Invalid staff role.';
  end if;

  insert into public.staff_invitations (code_hash, role, max_uses, expires_at)
  values (
    public.hash_invitation_code(v_clean),
    p_role,
    greatest(1, least(coalesce(p_max_uses, 1), 100)),
    case when p_expires_hours is null then null else now() + make_interval(hours => p_expires_hours) end
  )
  on conflict (code_hash) do update
  set role = excluded.role,
      max_uses = excluded.max_uses,
      active = true,
      expires_at = excluded.expires_at;
end;
$$;

-- Generate a cryptographically random invitation code on demand and return it once.
create or replace function public.generate_staff_invitation(
  p_role text default 'staff',
  p_max_uses integer default 1,
  p_expires_hours integer default 168
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_raw text;
  v_code text;
begin
  if auth.uid() is not null and not public.is_active_admin() then
    raise exception 'Unauthorized: manager or admin role required.';
  end if;

  v_raw := upper(encode(extensions.gen_random_bytes(6), 'hex'));
  v_code := 'BNB-' || substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4) || '-' || substr(v_raw, 9, 4);

  perform public.create_staff_invitation(v_code, p_role, p_max_uses, p_expires_hours);
  return v_code;
end;
$$;

-- Validate invitation_code on signup and automatically create a staff_profiles row.
create or replace function public.handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_code_hash text;
  v_full_name text;
  v_invite public.staff_invitations%rowtype;
begin
  v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invitation_code', '')));
  v_full_name := trim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '\s+', ' ', 'g'));

  if v_code !~ '^[A-Z0-9-]{6,32}$' then
    raise exception 'Invalid or expired staff invitation code.';
  end if;

  if char_length(v_full_name) < 2 or char_length(v_full_name) > 80 then
    raise exception 'Please provide a valid full name.';
  end if;

  v_code_hash := public.hash_invitation_code(v_code);

  select *
  into v_invite
  from public.staff_invitations
  where code_hash = v_code_hash
    and active = true
    and (expires_at is null or expires_at > now())
    and uses_count < max_uses
  for update;

  if not found then
    raise exception 'Invalid or expired staff invitation code.';
  end if;

  update public.staff_invitations
  set uses_count = uses_count + 1
  where code_hash = v_invite.code_hash;

  insert into public.staff_profiles (id, email, full_name, role, active)
  values (
    new.id,
    lower(trim(new.email)),
    v_full_name,
    v_invite.role,
    true
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row
  execute function public.handle_new_staff_user();

-- ---------------------------------------------------------------------------
-- 2. Products & kiosk orders
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]{1,64}$'),
  category_id text not null check (category_id ~ '^[a-z0-9-]{1,64}$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  price numeric(10, 2) not null check (price >= 0),
  available boolean not null default true,
  stock_quantity integer not null default 10 check (stock_quantity between 0 and 999),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.kiosk_queue_number_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  request_id uuid not null unique,
  queue_number integer not null default nextval('public.kiosk_queue_number_seq'),
  order_type text not null check (order_type in ('Dine-in', 'Take-out')),
  payment_method text not null check (payment_method in ('cash', 'e-wallet')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cooking', 'ready', 'completed', 'rejected')),
  updated_by uuid references public.staff_profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null references public.products (id),
  name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(10, 2) not null check (line_total >= 0)
);

-- Enable Realtime on orders so the staff portal receives live updates.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security (RLS) & least-privilege table grants
-- ---------------------------------------------------------------------------

revoke all on table public.staff_invitations from public, anon, authenticated;
revoke all on table public.staff_profiles from public, anon, authenticated;
revoke all on table public.products from public, anon, authenticated;
revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;

grant select on table public.staff_profiles to authenticated;
grant select on table public.products to anon, authenticated;
grant update (available, stock_quantity, updated_at) on table public.products to authenticated;
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;

alter table public.staff_invitations enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "staff read own profile" on public.staff_profiles;
create policy "staff read own profile"
  on public.staff_profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "public read products" on public.products;
create policy "public read products"
  on public.products
  for select
  to anon, authenticated
  using (true);

drop policy if exists "staff manage products" on public.products;
create policy "staff manage products"
  on public.products
  for update
  to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders"
  on public.orders
  for select
  to authenticated
  using (public.is_active_staff());

drop policy if exists "staff read order items" on public.order_items;
create policy "staff read order items"
  on public.order_items
  for select
  to authenticated
  using (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- 4. JSON serializer helper matching KioskOrder shape
-- ---------------------------------------------------------------------------

create or replace function public.serialize_kiosk_order(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'token', o.token,
    'requestId', o.request_id,
    'queueNumber', o.queue_number,
    'orderType', o.order_type,
    'paymentMethod', o.payment_method,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.product_id,
            'name', oi.name,
            'quantity', oi.quantity,
            'lineTotal', oi.line_total
          )
          order by oi.id
        )
        from public.order_items oi
        where oi.order_id = o.id
      ),
      '[]'::jsonb
    ),
    'subtotal', o.subtotal,
    'discount', o.discount,
    'total', o.total,
    'status', o.status,
    'createdAt', o.created_at
  )
  from public.orders o
  where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------------------
-- 5. Public kiosk RPCs (parameterized; zero dynamic SQL)
-- ---------------------------------------------------------------------------

create or replace function public.create_kiosk_order(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_request_id uuid;
  v_order_type text;
  v_payment_method text;
  v_existing_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_subtotal numeric(10, 2) := 0;
begin
  v_request_id := (p_request ->> 'requestId')::uuid;
  v_order_type := p_request ->> 'orderType';
  v_payment_method := p_request ->> 'paymentMethod';

  if v_request_id is null
     or v_order_type not in ('Dine-in', 'Take-out')
     or v_payment_method not in ('cash', 'e-wallet')
     or jsonb_typeof(p_request -> 'items') <> 'array'
     or jsonb_array_length(p_request -> 'items') = 0
     or jsonb_array_length(p_request -> 'items') > 50
  then
    raise exception 'Invalid order request.';
  end if;

  select id into v_existing_id from public.orders where request_id = v_request_id;
  if found then
    return public.serialize_kiosk_order(v_existing_id);
  end if;

  insert into public.orders (request_id, order_type, payment_method, subtotal, discount, total, status)
  values (v_request_id, v_order_type, v_payment_method, 0, 0, 0, 'pending')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_request -> 'items')
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Invalid item quantity.';
    end if;

    select * into v_product
    from public.products
    where id = v_item ->> 'id'
      and available = true;

    if not found then
      raise exception 'Item unavailable.';
    end if;

    insert into public.order_items (order_id, product_id, name, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);

    v_subtotal := v_subtotal + (v_product.price * v_qty);
  end loop;

  update public.orders
  set subtotal = v_subtotal,
      total = v_subtotal
  where id = v_order_id;

  return public.serialize_kiosk_order(v_order_id);
end;
$$;

create or replace function public.get_kiosk_order(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, extensions
as $$
  select public.serialize_kiosk_order(o.id)
  from public.orders o
  where o.token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- 6. Staff-only RPCs
-- ---------------------------------------------------------------------------

create or replace function public.staff_list_orders()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_active_staff() then
    raise exception 'Unauthorized: active staff account required.';
  end if;

  return coalesce(
    (
      select jsonb_agg(public.serialize_kiosk_order(o.id) order by o.created_at desc)
      from public.orders o
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.staff_update_order_status(p_token uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_order public.orders%rowtype;
  v_valid boolean := false;
begin
  if not public.is_active_staff() then
    raise exception 'Unauthorized: active staff account required.';
  end if;

  select * into v_order
  from public.orders
  where token = p_token
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  v_valid :=
    (v_order.status = 'pending' and p_status in ('confirmed', 'rejected'))
    or (v_order.status = 'confirmed' and p_status = 'cooking')
    or (v_order.status = 'cooking' and p_status = 'ready')
    or (v_order.status = 'ready' and p_status = 'completed');

  if not v_valid then
    raise exception 'Invalid status transition.';
  end if;

  update public.orders
  set status = p_status,
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_order.id;

  return public.serialize_kiosk_order(v_order.id);
end;
$$;

create or replace function public.staff_update_product_availability(
  p_id text,
  p_available boolean,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_product public.products%rowtype;
  v_resolved_available boolean;
begin
  if not public.is_active_staff() then
    raise exception 'Unauthorized: active staff account required.';
  end if;

  if p_id is null or p_id !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'Invalid product identifier.';
  end if;

  if p_quantity is null or p_quantity < 0 or p_quantity > 999 then
    raise exception 'Quantity must be between 0 and 999.';
  end if;

  v_resolved_available := case when p_quantity = 0 then false else coalesce(p_available, false) end;

  update public.products
  set available = v_resolved_available,
      stock_quantity = p_quantity,
      updated_at = now()
  where id = p_id
  returning * into v_product;

  if not found then
    raise exception 'Product not found.';
  end if;

  return jsonb_build_object(
    'id', v_product.id,
    'categoryId', v_product.category_id,
    'name', v_product.name,
    'price', v_product.price,
    'available', v_product.available,
    'quantity', v_product.stock_quantity
  );
end;
$$;

create or replace function public.staff_update_own_profile(
  p_first_name text,
  p_last_name text,
  p_middle_initial text default '',
  p_home_address text default '',
  p_avatar_url text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_first text := trim(regexp_replace(coalesce(p_first_name, ''), '\s+', ' ', 'g'));
  v_last text := trim(regexp_replace(coalesce(p_last_name, ''), '\s+', ' ', 'g'));
  v_mid text := upper(regexp_replace(trim(coalesce(p_middle_initial, '')), '\.$', ''));
  v_addr text := trim(regexp_replace(coalesce(p_home_address, ''), '\s+', ' ', 'g'));
  v_avatar text := trim(coalesce(p_avatar_url, ''));
  v_full text;
  v_profile public.staff_profiles%rowtype;
begin
  if not public.is_active_staff() then
    raise exception 'Unauthorized: active staff account required.';
  end if;

  if char_length(v_first) < 1 or char_length(v_first) > 40
     or char_length(v_last) < 1 or char_length(v_last) > 40 then
    raise exception 'Please provide a valid first and last name.';
  end if;

  if char_length(v_mid) > 2 then
    raise exception 'Middle initial must be 1 to 2 letters.';
  end if;

  if char_length(v_addr) > 200 then
    raise exception 'Home address must be 200 characters or fewer.';
  end if;

  if char_length(v_avatar) > 2900000 then
    raise exception 'Avatar image is too large.';
  end if;

  v_full := case
    when v_mid <> '' then v_first || ' ' || v_mid || '. ' || v_last
    else v_first || ' ' || v_last
  end;

  update public.staff_profiles
  set full_name = v_full,
      first_name = v_first,
      last_name = v_last,
      middle_initial = v_mid,
      home_address = v_addr,
      avatar_url = v_avatar,
      updated_at = now()
  where id = auth.uid()
  returning * into v_profile;

  if not found then
    raise exception 'Staff profile not found.';
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'email', v_profile.email,
    'fullName', v_profile.full_name,
    'firstName', v_profile.first_name,
    'lastName', v_profile.last_name,
    'middleInitial', v_profile.middle_initial,
    'homeAddress', v_profile.home_address,
    'avatarUrl', v_profile.avatar_url,
    'role', v_profile.role
  );
end;
$$;

-- Revoke default PUBLIC execution on all custom functions before explicit minimal grants.
revoke all on function public.hash_invitation_code(text) from public, anon, authenticated;
revoke all on function public.is_active_staff() from public, anon, authenticated;
revoke all on function public.is_active_admin() from public, anon, authenticated;
revoke all on function public.create_staff_invitation(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.generate_staff_invitation(text, integer, integer) from public, anon, authenticated;
revoke all on function public.handle_new_staff_user() from public, anon, authenticated;
revoke all on function public.serialize_kiosk_order(uuid) from public, anon, authenticated;
revoke all on function public.create_kiosk_order(jsonb) from public, anon, authenticated;
revoke all on function public.get_kiosk_order(uuid) from public, anon, authenticated;
revoke all on function public.staff_list_orders() from public, anon, authenticated;
revoke all on function public.staff_update_order_status(uuid, text) from public, anon, authenticated;
revoke all on function public.staff_update_product_availability(text, boolean, integer) from public, anon, authenticated;
revoke all on function public.staff_update_own_profile(text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.create_kiosk_order(jsonb) to anon, authenticated;
grant execute on function public.get_kiosk_order(uuid) to anon, authenticated;
grant execute on function public.staff_list_orders() to authenticated;
grant execute on function public.staff_update_order_status(uuid, text) to authenticated;
grant execute on function public.staff_update_product_availability(text, boolean, integer) to authenticated;
grant execute on function public.staff_update_own_profile(text, text, text, text, text) to authenticated;
grant execute on function public.create_staff_invitation(text, text, integer, integer) to authenticated;
grant execute on function public.generate_staff_invitation(text, integer, integer) to authenticated;

-- Seed initial admin invitation code (matches local dev code; rotate/expire after onboarding):
select public.create_staff_invitation('BNB-5JSN-SYN3', 'admin', 5, 168);
