-- ─────────────────────────────────────────────────────────────
-- Bloque H: caché de Hotelbeds Content API (TTL 30 días)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hotelbeds_content (
  hotel_code text PRIMARY KEY,
  name text NOT NULL,
  description_short text,
  description_long text,
  category_code text,
  category_label text,
  zone_name text,
  destination_code text,
  destination_name text,
  country_code text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  address text,
  phone text,
  email text,
  web text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  facilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  cancellation_policies jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_hotelbeds_content_expires
  ON public.hotelbeds_content (expires_at);

ALTER TABLE public.hotelbeds_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hc_read ON public.hotelbeds_content;
CREATE POLICY hc_read ON public.hotelbeds_content
  FOR SELECT USING (true);

COMMENT ON TABLE public.hotelbeds_content IS
  'Caché global de Hotelbeds Content API (descripciones, facilities, imágenes). Escrituras vía service_role.';

-- Código de hotel en líneas de cotización para rehidratar content en PDF
ALTER TABLE public.quote_line_items
  ADD COLUMN IF NOT EXISTS hotel_code text;

CREATE INDEX IF NOT EXISTS quote_line_items_hotel_code_idx
  ON public.quote_line_items (hotel_code)
  WHERE hotel_code IS NOT NULL;
