-- Bloque F: moneda base por agencia

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'EUR';

COMMENT ON COLUMN public.agencies.base_currency IS
  'Moneda ISO 4217 en la que se muestran las cotizaciones de la agencia.';

-- Ampliar monedas permitidas en quotes (antes solo EUR/USD/GBP)
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_currency_check;
ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_currency_check
  CHECK (char_length(currency) = 3);
