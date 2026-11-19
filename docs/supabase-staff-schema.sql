-- Bake'n Brew Kiosk + Staff Backend Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor (or as a Supabase CLI migration).
-- Aligns with docs/kiosk-order-integration.md and src/services/{orders,staffAuth,staffOrders}.ts.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Staff invitations & profiles
-- ---------------------------------------------------------------------------

create table if not exists public.staff_invitations (
  code text primary key,
  role text not null default 'staff' check (role in ('staff', 'manager', 'admin')),
  max_uses integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'staff' check (role in ('staff', 'manager', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Helper used by RLS policies and staff RPCs.
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_profiles
    where id = auth.uid()
      and active = true
  );
$$;

-- Validate invitation_code on signup and automatically create a staff_profiles row.
create or replace function public.handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_full_name text;
  v_invite public.staff_invitations%rowtype;
begin
  v_code := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invitation_code', '')), '');
  v_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  if v_code is null then
    raise exception 'A valid staff invitation code is required to register.';
  end if;

  select *
  into v_invite
  from public.staff_invitations
  where code = v_code
    and active = true
    and (expires_at is null or expires_at > now())
    and uses_count < max_uses
  for update;

  if not found then
    raise exception 'Invalid or expired staff invitation code.';
  end if;

  update public.staff_invitations
  set uses_count = uses_count + 1
  where code = v_invite.code;

  insert into public.staff_profiles (id, email, full_name, role, active)
  values (
    new.id,
    lower(new.email),
    coalesce(v_full_name, split_part(new.email, '@', 1)),
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
  id text primary key,
  category_id text not null,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  available boolean not null default true,
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
alter publication supabase_realtime add table public.orders;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ---------------------------------------------------------------------------

alter table public.staff_invitations enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Staff profiles: authenticated staff can read their own profile.
drop policy if exists "staff read own profile" on public.staff_profiles;
create policy "staff read own profile"
  on public.staff_profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Products: public kiosk can read menu availability; active staff can update availability.
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

-- Orders & order_items: NO direct anon select/update; active staff only.
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
set search_path = public
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
-- 5. Public kiosk RPCs (from docs/kiosk-order-integration.md)
-- ---------------------------------------------------------------------------

create or replace function public.create_kiosk_order(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  then
    raise exception 'Invalid order request.';
  end if;

  -- Idempotent retry lookup
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
      raise exception 'Item unavailable: %', coalesce(v_item ->> 'id', 'unknown');
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
set search_path = public
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
set search_path = public
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
set search_path = public
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
    raise exception 'Invalid status transition from % to %.', v_order.status, p_status;
  end if;

  update public.orders
  set status = p_status,
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_order.id;

  return public.serialize_kiosk_order(v_order.id);
end;
$$;

grant execute on function public.create_kiosk_order(jsonb) to anon, authenticated;
grant execute on function public.get_kiosk_order(uuid) to anon, authenticated;
grant execute on function public.staff_list_orders() to authenticated;
grant execute on function public.staff_update_order_status(uuid, text) to authenticated;

-- Example seed invitation code (replace before production):
-- insert into public.staff_invitations (code, role, max_uses) values ('BNB-STAFF-2026', 'staff', 10);
