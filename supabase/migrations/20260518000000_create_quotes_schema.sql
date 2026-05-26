-- ─────────────────────────────────────────────────────────────
-- TQuot: agencies, clients, quotes, quote_line_items (+ users profile)
-- Compatible with lib/pdf/utils/load-quote.ts and PDF auth (quotes.user_id)
-- Depends on: auth.users, existing inventory / agency_margins migrations
-- Run BEFORE: 20260517000000_add_agency_logos.sql (ALTER becomes redundant)
-- ─────────────────────────────────────────────────────────────

-- ── 1. Agent profile (load-quote: users!quotes_agent_id_fkey) ─────────────

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is
  'Perfil de agente (1:1 con auth.users). Usado por PDFs vía quotes.agent_id.';

-- Opcional: rellenar perfil al registrarse (ajusta si ya tienes otro trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Agencies (base table + columnas que add_agency_logos añadiría) ─────

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  logo_url text,
  legal_name text,
  tax_id text,
  address text,
  phone text,
  email text,
  website text,
  legal_disclaimer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agencies is 'Agencia de viajes (1 por owner en MVP).';
comment on column public.agencies.logo_url is
  'URL pública del logo en Supabase Storage. Se renderiza en los PDFs.';
comment on column public.agencies.legal_disclaimer is
  'Disclaimer legal personalizado en PDF cliente. NULL = texto por defecto en plantilla.';

create index if not exists agencies_owner_id_idx on public.agencies (owner_id);

-- Puente para políticas de storage en add_agency_logos.sql
create table if not exists public.agency_members (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);

create index if not exists agency_members_user_id_idx on public.agency_members (user_id);

create or replace function public.sync_agency_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_members (agency_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (agency_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists agencies_sync_owner_member on public.agencies;
create trigger agencies_sync_owner_member
  after insert on public.agencies
  for each row execute function public.sync_agency_owner_member();

-- ── 3. Clients ─────────────────────────────────────────────────────────────

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients (user_id);

-- ── 4. Quotes ──────────────────────────────────────────────────────────────

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete restrict,
  agent_id uuid not null,
  client_id uuid references public.clients (id) on delete set null,

  reference text not null,
  created_at timestamptz not null default now(),
  valid_until date not null,

  -- Trip (load-quote mapper)
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date not null,
  nights integer not null default 0 check (nights >= 0),
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  infants integer not null default 0 check (infants >= 0),
  purpose text not null default '',

  -- Totals
  total_net_cost numeric(12, 2) not null default 0,
  total_margin numeric(12, 2) not null default 0,
  total_margin_percent numeric(7, 4) not null default 0,
  total_public_price numeric(12, 2) not null default 0,
  currency text not null default 'EUR' check (currency in ('EUR', 'USD', 'GBP')),

  -- Notes / terms
  agent_notes text,
  client_message text,
  payment_terms text,
  cancellation_policy text,

  updated_at timestamptz not null default now(),

  constraint quotes_agent_id_fkey
    foreign key (agent_id) references public.users (id) on delete restrict,
  constraint quotes_user_agent_match_check
    check (agent_id = user_id),
  constraint quotes_valid_until_after_departure_check
    check (valid_until >= departure_date),
  constraint quotes_return_after_departure_check
    check (return_date >= departure_date),
  unique (user_id, reference)
);

comment on column public.quotes.user_id is
  'Propietario de la cotización (PDF auth + RLS). Debe coincidir con agent_id en MVP.';
comment on constraint quotes_user_agent_match_check on public.quotes is
  'MVP: un agente = un usuario. Relajar si más adelante agent_id != user_id.';

create index if not exists quotes_user_id_idx on public.quotes (user_id);
create index if not exists quotes_agency_id_idx on public.quotes (agency_id);
create index if not exists quotes_client_id_idx on public.quotes (client_id);
create index if not exists quotes_created_at_idx on public.quotes (created_at desc);

-- ── 5. Quote line items ────────────────────────────────────────────────────

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  sort_order integer not null default 0,

  category text not null check (
    category in ('flight', 'hotel', 'transfer', 'activity', 'insurance', 'other')
  ),
  description text not null,
  subtitle text,

  net_cost numeric(12, 2) not null default 0,
  margin numeric(12, 2) not null default 0,
  margin_percent numeric(7, 4) not null default 0,
  public_price numeric(12, 2) not null default 0,

  source text not null default 'WEB' check (
    source in ('INV_PROPIO', 'CORPORATIVO', 'WEB')
  ),
  internal_notes text,
  supplier text,

  per_person boolean not null default false,
  pax_count integer not null default 1 check (pax_count >= 1),

  created_at timestamptz not null default now()
);

create index if not exists quote_line_items_quote_id_sort_idx
  on public.quote_line_items (quote_id, sort_order);

-- ── 6. updated_at helper ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists agencies_set_updated_at on public.agencies;
create trigger agencies_set_updated_at
  before update on public.agencies
  for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- ── 7. Row Level Security ──────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.clients enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;

-- users: solo el propio perfil
create policy "Users read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- agencies: dueño
create policy "Agency owners read own agency"
  on public.agencies for select
  using (auth.uid() = owner_id);

create policy "Agency owners insert own agency"
  on public.agencies for insert
  with check (auth.uid() = owner_id);

create policy "Agency owners update own agency"
  on public.agencies for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Agency owners delete own agency"
  on public.agencies for delete
  using (auth.uid() = owner_id);

-- agency_members: ver solo membresías propias
create policy "Users read own agency memberships"
  on public.agency_members for select
  using (auth.uid() = user_id);

create policy "Agency owners manage memberships"
  on public.agency_members for all
  using (
    exists (
      select 1 from public.agencies a
      where a.id = agency_members.agency_id
        and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agencies a
      where a.id = agency_members.agency_id
        and a.owner_id = auth.uid()
    )
  );

-- clients: dueño agente
create policy "Users manage own clients"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- quotes: dueño
create policy "Users manage own quotes"
  on public.quotes for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and agent_id = auth.uid()
    and exists (
      select 1 from public.agencies a
      where a.id = quotes.agency_id
        and a.owner_id = auth.uid()
    )
  );

-- line items: vía quote padre
create policy "Users manage own quote line items"
  on public.quote_line_items for all
  using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quotes q
      where q.id = quote_line_items.quote_id
        and q.user_id = auth.uid()
    )
  );
