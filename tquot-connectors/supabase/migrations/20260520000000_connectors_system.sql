-- ─────────────────────────────────────────────────────────────
-- Migración: sistema de connectors para TQuot
-- supabase/migrations/20260520000000_connectors_system.sql
-- ─────────────────────────────────────────────────────────────
--
-- Crea las tablas necesarias para que cada agencia conecte sus propios
-- proveedores (Hotelbeds, RateHawk, Duffel, etc.) con sus credenciales.
--
-- Decisiones de diseño:
-- 1. Las credenciales se guardan encriptadas usando pgcrypto.
-- 2. La lista de proveedores soportados (provider_catalog) la define TQuot,
--    no la agencia. Es una lista cerrada que crece según vamos integrando.
-- 3. RLS estricto: cada agencia solo ve y modifica SUS propias conexiones.
-- 4. provider_catalog es público (read-only para todos los usuarios autenticados).
-- ─────────────────────────────────────────────────────────────

-- Activar pgcrypto para encriptar credenciales
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Tipos enumerados
-- ─────────────────────────────────────────────────────────────

create type provider_category as enum (
  'hotels',
  'flights',
  'activities',
  'transfers',
  'insurance',
  'cars',
  'packages',
  'corporate'
);

create type auth_type as enum (
  'api_key',           -- Una sola clave
  'api_key_secret',    -- Clave + secreto (Hotelbeds usa esto)
  'oauth_bearer',      -- Token bearer (Duffel)
  'basic_auth',        -- Usuario + contraseña
  'custom'             -- Cualquier otra cosa
);

create type connection_status as enum (
  'pending',       -- Acaba de crearse, nunca se ha probado
  'active',        -- Última prueba OK
  'error',         -- Última prueba falló
  'disabled'       -- Desactivada manualmente por la agencia
);

-- ─────────────────────────────────────────────────────────────
-- Tabla 1: provider_catalog
-- Lista cerrada de proveedores que TQuot sabe integrar.
-- La define TQuot, no las agencias. Crece según vamos añadiendo adaptadores.
-- ─────────────────────────────────────────────────────────────

create table provider_catalog (
  id              text primary key,                -- "hotelbeds", "duffel", "ratehawk"
  name            text not null,                   -- "Hotelbeds", "Duffel"
  category        provider_category not null,
  auth_type       auth_type not null,
  logo_url        text,                            -- URL pública del logo (Supabase Storage)
  description     text,                            -- Texto corto para mostrar en UI
  docs_url        text,                            -- Enlace a las docs oficiales del proveedor
  website_url     text,                            -- Web del proveedor para alta comercial

  -- Metadatos para la UI de configuración
  -- Define qué campos pedir al usuario según auth_type.
  -- Ejemplo: {"fields": [{"key": "api_key", "label": "API Key", "type": "password"}, ...]}
  config_schema   jsonb not null default '{}'::jsonb,

  -- Estado en TQuot
  is_implemented  boolean not null default false,  -- false = stub, true = adaptador funcional
  is_available    boolean not null default true,   -- false = oculto en UI (despreciado)

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger provider_catalog_updated_at
  before update on provider_catalog
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Tabla 2: agency_connections
-- Conexiones de cada agencia a proveedores específicos.
-- Una agencia puede tener N proveedores conectados.
-- ─────────────────────────────────────────────────────────────

create table agency_connections (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references agencies(id) on delete cascade,
  provider_id         text not null references provider_catalog(id) on delete restrict,

  -- Credenciales encriptadas (JSONB encriptado con pgp_sym_encrypt)
  -- La clave de encriptación viene de una variable de entorno (ver función decrypt_credentials).
  encrypted_credentials  bytea not null,

  -- Configuración adicional no sensible (timeouts, regiones, opciones)
  config              jsonb not null default '{}'::jsonb,

  -- Estado
  status              connection_status not null default 'pending',
  last_test_at        timestamptz,
  last_test_error     text, -- mensaje del último error si status = 'error'
  last_used_at        timestamptz, -- ultima vez que se uso en una cotizacion

  -- Metadatos
  display_name        text, -- alias opcional de la cuenta del proveedor
  notes               text, -- notas internas del agente
  created_by          uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint unique_provider_per_agency unique (agency_id, provider_id)
);

create index agency_connections_agency_idx
  on agency_connections(agency_id, status);

create index agency_connections_provider_idx
  on agency_connections(provider_id);

create trigger agency_connections_updated_at
  before update on agency_connections
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Tabla 3: comparator_logs (opcional pero útil)
-- Registra cada uso del comparador pre-reserva.
-- Permite optimizar timeouts, detectar proveedores lentos, etc.
-- ─────────────────────────────────────────────────────────────

create table comparator_logs (
  id                  uuid primary key default gen_random_uuid(),
  agency_id           uuid not null references agencies(id) on delete cascade,
  agent_id            uuid not null references auth.users(id),
  quote_id            uuid references quotes(id) on delete set null,

  -- Qué se comparó
  search_type         provider_category not null,
  search_params       jsonb not null, -- hotel, fechas, pax

  -- Resultados (por proveedor consultado)
  results_summary     jsonb not null, -- resumen por proveedor consultado

  -- Resultado elegido (si lo hubo)
  chosen_provider_id  text references provider_catalog(id),
  chosen_price        numeric(12, 2),

  created_at          timestamptz not null default now()
);

create index comparator_logs_agency_idx
  on comparator_logs(agency_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Encriptación de credenciales
-- ─────────────────────────────────────────────────────────────
--
-- La clave vive en el servidor Next.js (CREDENTIALS_KEY), no en la BD.
-- Se pasa como parámetro en cada RPC desde lib/connectors/storage.ts.
-- ─────────────────────────────────────────────────────────────

create or replace function encrypt_credentials(credentials_json jsonb, p_key text)
returns bytea
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null or p_key = '' then
    raise exception 'encryption key required';
  end if;
  return pgp_sym_encrypt(credentials_json::text, p_key);
end;
$$;

create or replace function decrypt_credentials(encrypted bytea, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null or p_key = '' then
    raise exception 'encryption key required';
  end if;
  return pgp_sym_decrypt(encrypted, p_key)::jsonb;
end;
$$;

revoke all on function decrypt_credentials(bytea, text) from public;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table provider_catalog enable row level security;
alter table agency_connections enable row level security;
alter table comparator_logs enable row level security;

-- Helper: agencias del usuario actual.
-- Asume tabla agency_members(user_id, agency_id) — ajustar si vuestro modelo difiere.
create or replace function user_agency_ids()
returns setof uuid
language sql stable
security definer
as $$
  select agency_id from agency_members where user_id = auth.uid();
$$;

-- ─── provider_catalog: público (read-only para usuarios autenticados) ───

create policy provider_catalog_select on provider_catalog
  for select
  using (auth.role() = 'authenticated');

-- Solo administradores de TQuot pueden modificar provider_catalog (no agencias).
-- Esto se hace fuera de RLS, con service_role key, desde scripts de migración.

-- ─── agency_connections: cada agencia ve solo las suyas ───

create policy agency_connections_select on agency_connections
  for select
  using (agency_id in (select user_agency_ids()));

create policy agency_connections_insert on agency_connections
  for insert
  with check (
    agency_id in (select user_agency_ids())
    and created_by = auth.uid()
  );

create policy agency_connections_update on agency_connections
  for update
  using (agency_id in (select user_agency_ids()));

create policy agency_connections_delete on agency_connections
  for delete
  using (agency_id in (select user_agency_ids()));

-- ─── comparator_logs: cada agencia ve solo los suyos ───

create policy comparator_logs_select on comparator_logs
  for select
  using (agency_id in (select user_agency_ids()));

create policy comparator_logs_insert on comparator_logs
  for insert
  with check (
    agency_id in (select user_agency_ids())
    and agent_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────
-- Vista útil: agency_connections_decrypted
-- ─────────────────────────────────────────────────────────────
--
-- Devuelve las credenciales descifradas SOLO para el código del servidor
-- (Server Actions, Route Handlers con service_role).
--
-- NUNCA exponer esta vista al cliente. Las políticas RLS no se aplican
-- a security definer functions, así que filtramos manualmente.
-- ─────────────────────────────────────────────────────────────

create or replace function get_connection_with_credentials(
  p_connection_id uuid,
  p_key text
)
returns table (
  id              uuid,
  agency_id       uuid,
  provider_id     text,
  credentials     jsonb,
  config          jsonb,
  status          connection_status
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar que el usuario actual tiene acceso a esta connection
  if not exists (
    select 1 from agency_connections ac
    where ac.id = p_connection_id
      and ac.agency_id in (select user_agency_ids())
  ) then
    raise exception 'No autorizado para acceder a esta conexión';
  end if;

  return query
  select
    ac.id,
    ac.agency_id,
    ac.provider_id,
    decrypt_credentials(ac.encrypted_credentials, p_key) as credentials,
    ac.config,
    ac.status
  from agency_connections ac
  where ac.id = p_connection_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Comentarios de documentación
-- ─────────────────────────────────────────────────────────────

comment on table provider_catalog is
  'Lista cerrada de proveedores que TQuot sabe integrar. La modifica TQuot, no las agencias.';
comment on table agency_connections is
  'Conexiones de cada agencia a proveedores. Las credenciales están encriptadas con pgcrypto.';
comment on table comparator_logs is
  'Histórico de usos del comparador pre-reserva. Útil para optimizar timeouts y detectar problemas.';
comment on function encrypt_credentials is
  'Encripta credenciales con pgp_sym_encrypt; la clave se pasa desde el servidor (CREDENTIALS_KEY).';
comment on function get_connection_with_credentials is
  'Obtiene una conexión con sus credenciales descifradas. Verifica permisos antes.';
