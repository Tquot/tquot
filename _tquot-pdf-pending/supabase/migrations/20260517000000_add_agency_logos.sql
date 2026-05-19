-- ─────────────────────────────────────────────────────────────
-- Migración: añadir soporte de logos personalizables por agencia
-- ─────────────────────────────────────────────────────────────
--
-- Aplicar con: supabase migration up
-- O ejecutar directamente en el SQL Editor de Supabase.

-- 1. Añadir columnas a la tabla agencies si no existen ya
-- ─────────────────────────────────────────────────────────

alter table if exists agencies
  add column if not exists logo_url text;

alter table if exists agencies
  add column if not exists legal_name text;

alter table if exists agencies
  add column if not exists tax_id text;

alter table if exists agencies
  add column if not exists address text;

alter table if exists agencies
  add column if not exists phone text;

alter table if exists agencies
  add column if not exists email text;

alter table if exists agencies
  add column if not exists website text;

alter table if exists agencies
  add column if not exists legal_disclaimer text;


-- 2. Crear el bucket de Storage para logos
-- ─────────────────────────────────────────
--
-- IMPORTANTE: este paso se hace una sola vez. Si ya existe, ignorar el error.
-- El bucket es público para que las URLs sean accesibles desde el PDF en runtime.

insert into storage.buckets (id, name, public)
values ('agency-logos', 'agency-logos', true)
on conflict (id) do nothing;


-- 3. Políticas de Storage
-- ───────────────────────
--
-- Solo usuarios autenticados pueden subir/modificar logos, y solo en la carpeta
-- de su propia agencia. Cualquiera puede leer (necesario para que el PDF cargue
-- la imagen desde la URL pública).

-- Lectura pública
drop policy if exists "agency_logos_public_read" on storage.objects;
create policy "agency_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'agency-logos');

-- Subida: solo si el primer segmento del path == agencia del usuario
-- AJUSTAR: esto asume que tienes una tabla `agency_members` con (user_id, agency_id).
-- Si tu modelo de pertenencia es distinto, adapta el subquery.

drop policy if exists "agency_logos_upload_own_agency" on storage.objects;
create policy "agency_logos_upload_own_agency"
  on storage.objects for insert
  with check (
    bucket_id = 'agency-logos'
    and (storage.foldername(name))[1] in (
      select agency_id::text
      from agency_members
      where user_id = auth.uid()
    )
  );

-- Update con la misma regla
drop policy if exists "agency_logos_update_own_agency" on storage.objects;
create policy "agency_logos_update_own_agency"
  on storage.objects for update
  using (
    bucket_id = 'agency-logos'
    and (storage.foldername(name))[1] in (
      select agency_id::text
      from agency_members
      where user_id = auth.uid()
    )
  );

-- Delete con la misma regla
drop policy if exists "agency_logos_delete_own_agency" on storage.objects;
create policy "agency_logos_delete_own_agency"
  on storage.objects for delete
  using (
    bucket_id = 'agency-logos'
    and (storage.foldername(name))[1] in (
      select agency_id::text
      from agency_members
      where user_id = auth.uid()
    )
  );


-- 4. Comentarios de documentación
-- ───────────────────────────────

comment on column agencies.logo_url is
  'URL pública del logo en Supabase Storage. Se renderiza en los PDFs.';
comment on column agencies.legal_disclaimer is
  'Disclaimer legal personalizado que aparece al pie del PDF cliente. Si NULL, se usa el disclaimer por defecto.';
