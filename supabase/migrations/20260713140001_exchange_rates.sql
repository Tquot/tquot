-- Bloque F: caché de tipos de cambio

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric(18, 8) NOT NULL,
  source text NOT NULL DEFAULT 'api',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  UNIQUE (from_currency, to_currency, source)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
  ON public.exchange_rates (from_currency, to_currency, expires_at DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS er_read_all ON public.exchange_rates;
CREATE POLICY er_read_all ON public.exchange_rates
  FOR SELECT USING (true);

-- Escrituras vía service_role / server
DROP POLICY IF EXISTS er_service_write ON public.exchange_rates;
CREATE POLICY er_service_write ON public.exchange_rates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
