-- Bloque G: registros de accesibilidad (TUR4all / manual / derived)

CREATE TABLE IF NOT EXISTS public.accessibility_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotelbeds_code text,
  external_provider text,
  item_type text NOT NULL CHECK (item_type IN ('hotel', 'experience', 'transfer')),
  name text NOT NULL,
  destination text,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotelbeds_code, item_type)
);

CREATE INDEX IF NOT EXISTS idx_accessibility_records_hb_code
  ON public.accessibility_records (hotelbeds_code)
  WHERE hotelbeds_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accessibility_records_name
  ON public.accessibility_records (lower(name), item_type);

ALTER TABLE public.accessibility_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ar_read ON public.accessibility_records;
CREATE POLICY ar_read ON public.accessibility_records
  FOR SELECT USING (true);

COMMENT ON TABLE public.accessibility_records IS
  'Datos de accesibilidad verificados (TUR4all/manual) o derivados. Escrituras vía service_role.';
